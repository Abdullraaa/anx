#!/usr/bin/env python3
"""
Generates interim_zone_pricing_final.json — the provisional zone pricing.

    price = round_to_100( BASE_FEE + RATE_PER_KM * haversine_km * ROAD_FACTOR )

These are NOT client-confirmed rates. The client's own sheet had 21 unpriced
pairs and 58 directional mismatches over 15% (see ../client_questions.txt),
so it could not be loaded as-is; this formula stands in until they answer.
Pricing is symmetric by construction, which is itself one of the open
questions.

Kept in the repo so the numbers stay reproducible and auditable rather than
being an unexplained matrix — the coordinates below previously existed only
on one machine, which blocked adding Mpape.

    python3 interim_pricing_generator.py            # rewrite the json
    python3 interim_pricing_generator.py --check    # verify, write nothing
"""
import json
import math
import os
import sys

BASE_FEE = 3000
RATE_PER_KM = 60
ROAD_FACTOR = 1.4          # straight-line -> road distance
SAME_ZONE_PRICE = 3000     # = BASE_FEE; the formula at zero distance

# Approximate district centroids, Abuja.
coords = {
    "Central Area": (9.0574, 7.4898),
    "Garki":        (9.0332, 7.4892),
    "Wuse":         (9.0630, 7.4767),
    "Wuse 2":       (9.0680, 7.4720),
    "Utako":        (9.0680, 7.4460),
    "Jabi":         (9.0765, 7.4165),
    "Jahi":         (9.0870, 7.4030),
    "Gwarinpa":     (9.1080, 7.4130),
    "Maitama":      (9.0930, 7.4890),
    "Asokoro":      (9.0330, 7.5270),
    "Durumi":       (9.0450, 7.4680),
    "Galadimawa":   (8.9750, 7.4230),
    "Gudu":         (9.0180, 7.4440),
    "Apo":          (8.9980, 7.4850),
    "Lugbe":        (8.9450, 7.3680),
    "Kubwa":        (9.1500, 7.3350),
    "Dutse":        (9.1350, 7.3700),
    "Dakwo":        (8.9900, 7.4150),
    "Kado":         (9.0940, 7.4450),
    "Karu":         (9.0100, 7.5900),
    "Nyanya":       (9.0090, 7.5580),
    "Kuje":         (8.8790, 7.2260),
    "Lokogoma":     (8.9800, 7.4600),
    "Airport Road": (8.9500, 7.3500),
    "Mpape":        (9.1050, 7.4700),
}

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "interim_zone_pricing_final.json")


def haversine_km(a, b):
    lat1, lon1 = a
    lat2, lon2 = b
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    x = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def price(a, b):
    d = haversine_km(coords[a], coords[b]) * ROAD_FACTOR
    return int(round((BASE_FEE + RATE_PER_KM * d) / 100.0)) * 100


def build():
    """All directed cross-zone pairs. Same-zone is not represented here —
    migration 007 adds those rows; see the note below."""
    zones = sorted(coords)
    return [{"from": a, "to": b, "price": price(a, b)}
            for a in zones for b in zones if a != b]


if __name__ == "__main__":
    rows = build()
    n = len(coords)
    assert len(rows) == n * (n - 1), f"expected {n * (n - 1)} rows, got {len(rows)}"
    assert all(price(r["from"], r["to"]) == price(r["to"], r["from"]) for r in rows)

    if "--check" in sys.argv:
        on_disk = json.load(open(OUT))
        same = on_disk == rows
        print(f"{len(rows)} rows for {n} zones — on-disk file "
              f"{'MATCHES' if same else 'DIFFERS FROM'} the generator")
        sys.exit(0 if same else 1)

    json.dump(rows, open(OUT, "w"), indent=2)
    print(f"wrote {len(rows)} rows for {n} zones -> {os.path.basename(OUT)}")

# Note on SAME_ZONE_PRICE: the source data has no same-zone entries, so these
# rows extrapolate the formula to a case the client never priced. 3000 is what
# the formula yields at zero distance (distance term goes to zero, leaving
# BASE_FEE), so the value is method-consistent — but the decision to price
# same-zone trips at the bare base fee at all is still an assumption to
# confirm. An earlier revision used 3100, the cheapest cross-zone fare.
