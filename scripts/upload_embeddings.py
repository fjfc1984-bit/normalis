"""
NormaLis RAG — Paso B: Generar Embeddings y Subir a Cloudflare Vectorize
=========================================================================
Lee chunks.json, genera embeddings con Cloudflare Workers AI (bge-m3)
y los indexa en Cloudflare Vectorize.

PRE-REQUISITOS:
    1. Tener chunks.json generado por prepare_rag.py
    2. Crear el índice Vectorize (una sola vez):
         wrangler vectorize create normalis-rag --dimensions=768 --metric=cosine
    3. Obtener tu Account ID y API Token de Cloudflare:
         - Account ID: dashboard.cloudflare.com → clic en tu nombre (barra lateral derecha)
         - API Token: My Profile → API Tokens → Create Token
           Permisos requeridos: "Cloudflare Workers AI:Edit" + "Vectorize:Edit"

USO:
    # Editar las credenciales abajo (CF_ACCOUNT_ID, CF_API_TOKEN)
    python scripts/upload_embeddings.py

    # Para re-indexar desde cero (si cambias los PDFs):
    python scripts/upload_embeddings.py --reset
"""

import json
import os
import sys
import time
import argparse
import requests

# ─── CONFIGURACIÓN — EDITAR AQUÍ ─────────────────────────────────────────────
CF_ACCOUNT_ID = "e4ba3dc6b998c992411a8bc56bc02d2b"
CF_API_TOKEN  = os.environ.get("CF_API_TOKEN", "TU_API_TOKEN")
INDEX_NAME    = "normalis-rag"
# ─────────────────────────────────────────────────────────────────────────────

CHUNKS_FILE  = os.path.join(os.path.dirname(__file__), "chunks.json")
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "upload_progress.json")
BATCH_SIZE   = 50    # Vectorize acepta hasta 1000 por lote; 50 es conservador
SLEEP_BETWEEN_BATCHES = 1.0  # segundos entre lotes (respetar rate limits)

CF_AI_URL        = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3"
CF_VECTORIZE_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/vectorize/indexes/{INDEX_NAME}/upsert"

HEADERS = {
    "Authorization": f"Bearer {CF_API_TOKEN}",
    "Content-Type": "application/json"
}

# ─── Funciones ────────────────────────────────────────────────────────────────

def get_embedding(text):
    """
    Genera un embedding usando Cloudflare Workers AI con el modelo bge-m3.
    bge-m3 es multilingüe — soporta español perfectamente.
    Produce vectores de 768 dimensiones.
    """
    # Truncar texto a 8192 tokens máximo (bge-m3 limit)
    # Aprox. 4 chars/token → ~32K chars
    text_truncated = text[:32000]

    response = requests.post(
        CF_AI_URL,
        headers=HEADERS,
        json={"text": [text_truncated]}
    )

    if response.status_code != 200:
        raise Exception(f"Workers AI error {response.status_code}: {response.text}")

    data = response.json()
    if not data.get("success"):
        raise Exception(f"Workers AI falló: {data.get('errors', data)}")

    return data["result"]["data"][0]  # vector de 768 floats


def upload_batch_to_vectorize(vectors):
    """
    Sube un lote de vectores a Cloudflare Vectorize.
    Formato: NDJSON (una línea JSON por vector).

    Cada vector tiene:
    - id: string único
    - values: lista de 768 floats
    - metadata: dict con text, source, chunk_index (máx 10KB)
    """
    ndjson_lines = []
    for v in vectors:
        ndjson_lines.append(json.dumps({
            "id":       v["id"],
            "values":   v["values"],
            "metadata": {
                "text":        v["metadata"]["text"][:2000],  # Vectorize: max 10KB metadata total
                "source":      v["metadata"]["source"],
                "chunk_index": v["metadata"]["chunk_index"]
            }
        }))

    ndjson_body = "\n".join(ndjson_lines)

    response = requests.post(
        CF_VECTORIZE_URL,
        headers={
            "Authorization": f"Bearer {CF_API_TOKEN}",
            "Content-Type": "application/x-ndjson"
        },
        data=ndjson_body.encode("utf-8")
    )

    if response.status_code not in (200, 201):
        raise Exception(f"Vectorize error {response.status_code}: {response.text}")

    result = response.json()
    if not result.get("success"):
        raise Exception(f"Vectorize falló: {result.get('errors', result)}")

    return result["result"].get("mutationId", "ok")


def load_progress():
    """Carga el progreso anterior para poder reanudar si se interrumpe."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"processed_ids": []}


def save_progress(processed_ids):
    """Guarda qué IDs ya fueron procesados."""
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"processed_ids": processed_ids}, f)


def delete_index_vectors():
    """Elimina todos los vectores del índice (para re-indexar desde cero)."""
    print("Borrando vectores existentes...")
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/vectorize/indexes/{INDEX_NAME}"
    # Cloudflare no tiene "delete all" — se debe recrear el índice
    # En su lugar, borramos y recreamos
    del_response = requests.delete(url, headers={"Authorization": f"Bearer {CF_API_TOKEN}"})
    print(f"  Index delete: {del_response.status_code}")
    time.sleep(2)

    # Recrear
    create_url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/vectorize/indexes"
    create_response = requests.post(
        create_url,
        headers=HEADERS,
        json={"name": INDEX_NAME, "config": {"dimensions": 768, "metric": "cosine"}}
    )
    print(f"  Index create: {create_response.status_code} — {create_response.json().get('result', {}).get('name', '?')}")
    time.sleep(3)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Sube embeddings a Cloudflare Vectorize")
    parser.add_argument("--reset", action="store_true", help="Borrar índice y re-indexar todo")
    args = parser.parse_args()

    # Validar configuración
    if CF_ACCOUNT_ID == "TU_ACCOUNT_ID" or CF_API_TOKEN == "TU_API_TOKEN":
        print("ERROR: Edita CF_ACCOUNT_ID y CF_API_TOKEN en este script antes de correr.")
        print("  Account ID: dashboard.cloudflare.com → barra lateral derecha")
        print("  API Token:  My Profile → API Tokens → Create Token")
        sys.exit(1)

    # Cargar chunks
    if not os.path.exists(CHUNKS_FILE):
        print(f"ERROR: No encontré {CHUNKS_FILE}")
        print("Primero corre: python scripts/prepare_rag.py")
        sys.exit(1)

    with open(CHUNKS_FILE, encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"\nNormaLis RAG — Upload de Embeddings a Vectorize")
    print(f"{'='*50}")
    print(f"Total fragmentos en chunks.json: {len(chunks)}")
    print(f"Índice Vectorize: {INDEX_NAME}")
    print(f"Modelo embedding: @cf/baai/bge-m3 (768 dims, multilingüe)\n")

    # Reset si se pidió
    if args.reset:
        delete_index_vectors()
        if os.path.exists(PROGRESS_FILE):
            os.remove(PROGRESS_FILE)

    # Cargar progreso (para reanudar si se interrumpió)
    progress = load_progress()
    already_done = set(progress["processed_ids"])

    pending = [c for c in chunks if c["id"] not in already_done]
    print(f"Pendientes: {len(pending)} (ya procesados: {len(already_done)})")

    if not pending:
        print("Todo ya está indexado. Usa --reset para re-indexar.")
        return

    processed_ids = list(already_done)
    batch = []
    errors = []

    for i, chunk in enumerate(pending):
        print(f"  [{i+1}/{len(pending)}] Embedding: {chunk['id'][:60]}", end="", flush=True)

        try:
            embedding = get_embedding(chunk["text"])
            batch.append({
                "id":     chunk["id"],
                "values": embedding,
                "metadata": {
                    "text":        chunk["text"],
                    "source":      chunk["source"],
                    "chunk_index": chunk["chunk_index"]
                }
            })
            print(f" ✓ ({len(embedding)} dims)")

        except Exception as e:
            print(f" ERROR: {e}")
            errors.append({"id": chunk["id"], "error": str(e)})
            continue

        # Subir cuando el lote esté lleno o sea el último
        if len(batch) >= BATCH_SIZE or i == len(pending) - 1:
            if batch:
                try:
                    mutation_id = upload_batch_to_vectorize(batch)
                    print(f"    → Lote de {len(batch)} vectores subido (mutationId: {mutation_id})")
                    processed_ids.extend([v["id"] for v in batch])
                    save_progress(processed_ids)
                    batch = []
                    time.sleep(SLEEP_BETWEEN_BATCHES)
                except Exception as e:
                    print(f"    ERROR subiendo lote: {e}")
                    errors.append({"batch_error": str(e)})

    # Resumen final
    print(f"\n{'='*50}")
    print(f"Completado: {len(processed_ids)} vectores indexados")
    if errors:
        print(f"Errores: {len(errors)}")
        for err in errors[:5]:
            print(f"  - {err}")

    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)

    print(f"\nIndice '{INDEX_NAME}' listo para consultas.")
    print(f"Siguiente paso: redeploy del cloudflare-worker.js")
    print(f"  wrangler deploy")


if __name__ == "__main__":
    main()
