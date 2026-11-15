"""Exporta el histórico de TMF3 al formato del prototipo, sin ajustar modelos."""
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NUMERIC = {"lead_time", "total_nights", "adults", "children", "babies", "children_missing"}


def export(source):
    gold = source / "data/processed/hotel_bookings_prepared.csv"
    reports = source / "reports"
    metrics = json.loads((reports / "ml_metricas.json").read_text(encoding="utf-8"))
    if hashlib.sha256(gold.read_bytes()).hexdigest() != metrics["sha256_gold"]:
        raise ValueError("La huella del Gold no coincide con el informe de TMF3.")
    features = metrics["predictores"]
    with gold.open(encoding="utf-8", newline="") as stream:
        rows = {row["meta_row_id"]: row for row in csv.DictReader(stream)}
    categories = {
        key: sorted({row[key] for row in rows.values()} - {""})
        for key in features if key not in NUMERIC
    }
    batches = defaultdict(list)
    with (reports / "ml_predicciones.csv").open(encoding="utf-8", newline="") as stream:
        for prediction in csv.DictReader(stream):
            batches[prediction["particion"], prediction["mes"]].append(prediction)
    history = []
    for (partition, month), batch in sorted(batches.items(), reverse=True):
        batch.sort(key=lambda p: (
            -float(p["logistica"]),
            hashlib.sha256(f"42|{p['id']}".encode()).hexdigest(),
            int(p["id"]),
        ))
        for rank, prediction in enumerate(batch, start=1):
            row = rows[prediction["id"]]
            priority = prediction["prioridad_logistica"] == "True"
            if priority != (rank <= len(batch) * 20 // 100):
                raise ValueError(f"Prioridad incoherente para {prediction['id']}.")
            if (row["meta_booking_date_proxy"][:7] != month
                    or row["hotel"] != prediction["hotel"]
                    or row["distribution_channel"] != prediction["canal"]):
                raise ValueError(f"Datos de origen incoherentes para {prediction['id']}.")
            values = [
                (int(float(row[key])) if row[key] else None) if key in NUMERIC
                else row[key] or None
                for key in features
            ]
            history.append([
                int(prediction["id"]), partition, month, row["meta_arrival_date"],
                float(prediction["logistica"]), priority, rank, len(batch), *values,
            ])
    if len({row[0] for row in history}) != len(history):
        raise ValueError("IDs repetidos en la exportación.")
    return {
        "features": features,
        "categories": categories,
        "columns": ["id", "partition", "month", "arrival", "score", "priority", "rank", "size", *features],
        "rows": history,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origen", type=Path, default=ROOT.parent / "TMF3")
    args = parser.parse_args()
    payload = export(args.origen)
    target = ROOT / "prototipo/datos/historico.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(payload['rows'])} reservas exportadas a {target}")
