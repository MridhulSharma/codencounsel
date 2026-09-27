#!/usr/bin/env python3
"""Export the Allston / 02134 pilot SQLite database into compact static JSON.

Usage:
    python3 scripts/export-data.py path/to/02134.db [--out public/data]

The frontend reads only the files written here. Owner names, mailing
addresses, and deed grantor/grantee names are deliberately NOT exported.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
from pathlib import Path

HISTORY_MIN_FY = 2012
SALES_MIN_DATE = "2019-01-01"
PERMITS_MIN_DATE = "2016-01-01"

# Deed-type values in the source data that are not ordinary market transfers.
NON_MARKET_DOC_TYPES = {"FORCLOSURE DEED", "CONFIRMATORY DEED", "MASTER DEED"}


def num(v):
    """Return a JSON-friendly number or None (never NaN / empty string)."""
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(f):
        return None
    return int(f) if f.is_integer() else round(f, 2)


def text(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def centroid(wkt: str | None):
    """Mean of polygon vertices — adequate for neighbourhood-scale distance."""
    if not wkt:
        return None
    pts = re.findall(r"(-?\d+\.\d+)\s+(-?\d+\.\d+)", wkt)
    if not pts:
        return None
    xs = [float(x) for x, _ in pts]
    ys = [float(y) for _, y in pts]
    return round(sum(ys) / len(ys), 6), round(sum(xs) / len(xs), 6)


def name_tokens(s: str | None) -> set[str]:
    if not s:
        return set()
    stop = {"LLC", "INC", "TRUST", "TR", "TRS", "THE", "OF", "AND", "REVOCABLE",
            "LIVING", "NOMINEE", "REALTY", "CORP", "LP", "LTD", "TRUSTEE", "TRUSTEES",
            "FAMILY", "IRREVOCABLE", "ESTATE", "ET", "AL", "JR", "SR"}
    return {t for t in re.split(r"[^A-Z]+", s.upper()) if len(t) > 2 and t not in stop}


def export(db_path: Path, out: Path) -> None:
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    out.mkdir(parents=True, exist_ok=True)

    # FY2026 tax bill (latest bill year in the pilot data).
    bills = {}
    for r in con.execute("SELECT * FROM tax_bill WHERE bill_year = (SELECT MAX(bill_year) FROM tax_bill)"):
        bills[r["pid"]] = {
            "year": r["bill_year"],
            "grossTax": num(r["gross_re_tax"]),
            "residentialExemption": num(r["resex_amt"]),
            "cpa": num(r["cpa_tax"]),
            "totalBilled": num(r["total_billed_amt"]),
        }

    latest_fy = con.execute("SELECT MAX(fiscal_year) FROM assessment_history").fetchone()[0]
    latest = {r['pid']: r['assessed_value'] for r in con.execute(
        'SELECT pid, assessed_value FROM assessment_history WHERE fiscal_year = ?', (latest_fy,))}

    parcels = []
    for r in con.execute("SELECT * FROM parcel ORDER BY st_name, st_num, unit_num"):
        c = centroid(r["geometry_wkt"])
        parcels.append({
            "pid": r["pid"],
            "address": text(r["full_address"]),
            "streetNumber": text(r["st_num"] and str(num(r["st_num"]))),
            "streetName": text(r["st_name"]),
            "unit": text(r["unit_num"]),
            "zip": text(r["zip_code"]),
            "landUse": text(r["lu"]),
            "landUseDesc": text(r["lu_desc"]),
            "buildingType": text(r["bldg_type"]),
            "condoMainId": text(r["cm_id"]),
            "resUnits": num(r["res_units"]),
            "landSf": num(r["land_sf"]),
            "grossArea": num(r["gross_area"]),
            "livingArea": num(r["living_area"]),
            "yearBuilt": num(r["yr_built"]),
            "yearRemodeled": num(r["yr_remodel"]),
            "bedrooms": num(r["bed_rms"]),
            "fullBaths": num(r["full_bth"]),
            "halfBaths": num(r["hlf_bth"]),
            "totalRooms": num(r["tt_rms"]),
            "overallCondition": text(r["overall_cond"]),
            "interiorCondition": text(r["int_cond"]),
            "exteriorCondition": text(r["ext_cond"]),
            "landValue": num(r["land_value"]),
            "buildingValue": num(r["bldg_value"]),
            "totalValue": num(r["total_value"]),
            "grossTax": num(r["gross_tax"]),
            "fiscalYear": latest_fy if latest.get(r['pid']) == r['total_value'] else None,
            "lat": c[0] if c else None,
            "lon": c[1] if c else None,
            "taxBill": bills.get(r["pid"]),
        })

    pids = {p["pid"] for p in parcels}

    history: dict[str, list[list[int]]] = {}
    for r in con.execute(
        "SELECT pid, fiscal_year, assessed_value FROM assessment_history "
        "WHERE fiscal_year >= ? AND assessed_value IS NOT NULL ORDER BY pid, fiscal_year",
        (HISTORY_MIN_FY,),
    ):
        history.setdefault(r["pid"], []).append([r["fiscal_year"], int(r["assessed_value"])])

    # Deeds recorded at one book/page that cover several parcels are portfolio
    # transfers; their price cannot be attributed to a single parcel.
    multi = {
        r[0]
        for r in con.execute(
            "SELECT book_page FROM sale WHERE book_page LIKE '%/%' AND book_page NOT LIKE '%.pdf' "
            "GROUP BY book_page HAVING COUNT(DISTINCT pid) > 1"
        )
    }

    sales = []
    seen = set()
    for r in con.execute(
        "SELECT * FROM sale WHERE rank_keep = 1 AND pid IS NOT NULL AND pid <> '' "
        "AND sale_date >= ? ORDER BY sale_date",
        (SALES_MIN_DATE,),
    ):
        if r["pid"] not in pids:
            continue
        key = (r["pid"], r["sale_date"], num(r["sale_price"]))
        if key in seen:
            continue
        seen.add(key)
        related = bool(name_tokens(r["grantor"]) & name_tokens(r["grantee"]))
        doc = text(r["doc_type"])
        sales.append({
            "id": r["sale_id"],
            "pid": r["pid"],
            "date": r["sale_date"],
            "price": num(r["sale_price"]),
            "docType": doc,
            "source": text(r["source"]),
            "confidence": text(r["confidence"]),
            "deedRef": text(r["book_page"]) if r["book_page"] and "/" in r["book_page"] and not r["book_page"].endswith(".pdf") else None,
            "multiParcel": r["book_page"] in multi,
            "namesOverlap": related,
            "nonMarketDocType": (doc or "").upper() in NON_MARKET_DOC_TYPES,
        })

    permits: dict[str, list[dict]] = {}
    for r in con.execute(
        "SELECT * FROM permit WHERE issued_date >= ? AND parcel_id IS NOT NULL ORDER BY issued_date DESC",
        (PERMITS_MIN_DATE,),
    ):
        if r["parcel_id"] not in pids:
            continue
        permits.setdefault(r["parcel_id"], []).append({
            "number": text(r["permitnumber"]),
            "workType": text(r["worktype"]),
            "permitType": text(r["permittypedescr"]),
            "declaredValue": num(r["declared_valuation"]),
            "issued": text(r["issued_date"] and r["issued_date"][:10]),
            "status": text(r["status"]),
        })

    meta = {
        "source": "Allston / ZIP 02134 pilot SQLite database (City of Boston assessing, "
                  "Suffolk Registry of Deeds, and Boston permit records as compiled for the hackathon)",
        "latestFiscalYear": latest_fy,
        "counts": {
            "parcels": len(parcels),
            "sales": len(sales),
            "historyParcels": len(history),
            "permitParcels": len(permits),
        },
        "latestSaleDate": max((s["date"] for s in sales), default=None),
        "generatedFrom": "02134 pilot database",
    }

    def prune(o):
        # Drop null fields so the static files stay small; the frontend treats
        # a missing field as "not recorded".
        if isinstance(o, dict):
            return {k: prune(v) for k, v in o.items() if v is not None}
        if isinstance(o, list):
            return [prune(v) for v in o]
        return o

    def dump(name, obj):
        (out / name).write_text(json.dumps(prune(obj), separators=(",", ":"), ensure_ascii=False))

    dump("parcels.json", parcels)
    dump("search.json", [{"pid": p["pid"], "address": p["address"], "landUse": p["landUse"]} for p in parcels])
    dump("sales.json", sales)
    dump("history.json", history)
    dump("permits.json", permits)
    dump("meta.json", meta)
    audit_queries = {
        'duplicateParcelGroups': 'SELECT count(*) FROM (SELECT pid FROM parcel GROUP BY pid HAVING count(*)>1)',
        'duplicateSaleGroups': 'SELECT count(*) FROM (SELECT pid,sale_date,sale_price FROM sale GROUP BY pid,sale_date,sale_price HAVING count(*)>1)',
        'unlinkedSales': "SELECT count(*) FROM sale WHERE pid IS NULL OR pid=''",
        'missingSalePrices': 'SELECT count(*) FROM sale WHERE sale_price IS NULL',
        'zeroOrNegativeSales': 'SELECT count(*) FROM sale WHERE sale_price<=0',
        'nominalSalesBelow10000': 'SELECT count(*) FROM sale WHERE sale_price<10000',
        'invalidSaleDates': 'SELECT count(*) FROM sale WHERE date(sale_date) IS NULL',
        'missingLivingArea': 'SELECT count(*) FROM parcel WHERE living_area IS NULL OR living_area<=0',
        'missingPropertyType': "SELECT count(*) FROM parcel WHERE lu IS NULL OR lu=''",
        'missingAssessmentYear': 'SELECT count(*) FROM assessment_history WHERE fiscal_year IS NULL',
        'duplicateAssessmentYears': 'SELECT count(*) FROM (SELECT pid,fiscal_year FROM assessment_history GROUP BY pid,fiscal_year HAVING count(*)>1)',
        'unmatchedPermits': 'SELECT count(*) FROM permit WHERE parcel_id NOT IN (SELECT pid FROM parcel)',
        'extremePricePerCurrentSqft': 'SELECT count(*) FROM sale s JOIN parcel p ON s.pid=p.pid WHERE p.living_area>0 AND (s.sale_price/p.living_area<100 OR s.sale_price/p.living_area>2500)',
    }
    dump('audit.json', {
        'rawCounts': {table: con.execute(f'SELECT count(*) FROM {table}').fetchone()[0] for table in
                      ['parcel','sale','assessment_history','tax_bill','owner','permit','zoning','building','title_doc']},
        'quality': {key: con.execute(query).fetchone()[0] for key, query in audit_queries.items()},
        'exportCounts': meta['counts'],
    })
    con.close()
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("db", type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "public" / "data")
    a = ap.parse_args()
    export(a.db, a.out)
