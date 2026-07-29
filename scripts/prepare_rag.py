"""
NormaLis RAG — Paso A: Preparación de la Normativa
====================================================
Extrae texto de PDFs normativos colombianos, los divide en fragmentos (chunks)
y genera el archivo chunks.json listo para indexar en Cloudflare Vectorize.

USO:
    # Instalar dependencias (una sola vez):
    pip install pdfplumber

    # Colocar los PDFs en scripts/pdfs/ y correr:
    python scripts/prepare_rag.py

SALIDA:
    scripts/chunks.json  — fragmentos listos para upload_embeddings.py

PDFS recomendados (descargar de minsalud.gov.co):
    - res_3100_2019.pdf   → Resolución 3100 de 2019
    - res_465_2025.pdf    → Resolución 465 de 2025
    - res_256_2016.pdf    → Resolución 256 de 2016 (indicadores)
    - res_0312_2019.pdf   → Resolución 0312 de 2019 (SG-SST)
"""

import os
import json
import re

try:
    import pdfplumber
except ImportError:
    print("ERROR: Falta pdfplumber. Ejecuta: pip install pdfplumber")
    exit(1)

# ─── Configuración ────────────────────────────────────────────────────────────
PDF_DIR    = os.path.join(os.path.dirname(__file__), "pdfs")
OUTPUT     = os.path.join(os.path.dirname(__file__), "chunks.json")
CHUNK_SIZE = 500    # palabras por fragmento
OVERLAP    = 80     # palabras de solapamiento entre fragmentos

# PDFs a procesar: (nombre_archivo, etiqueta_fuente)
PDFS = [
    ("res_3100_2019.pdf",  "Resolución 3100 de 2019 — Habilitación IPS"),
    ("res_465_2025.pdf",   "Resolución 465 de 2025 — Modifica Res. 3100"),
    ("res_256_2016.pdf",   "Resolución 256 de 2016 — Indicadores de Calidad"),
    ("res_0312_2019.pdf",  "Resolución 0312 de 2019 — SG-SST"),
]

# ─── Funciones ────────────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path):
    """Extrae texto de un PDF página por página."""
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text()
            if page_text:
                # Limpiar caracteres de control pero mantener saltos de línea
                page_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', page_text)
                text += page_text + "\n"
    return text


def split_into_chunks(text, chunk_size=CHUNK_SIZE, overlap=OVERLAP):
    """
    Divide el texto en fragmentos inteligentes:
    1. Intenta mantener artículos completos juntos
    2. Si un artículo es muy largo, lo divide con overlap
    3. El overlap garantiza que el contexto no se pierda entre fragmentos
    """
    chunks = []

    # Estrategia 1: dividir por artículos (ideal para resoluciones)
    # Detecta "ARTÍCULO N.", "Artículo N°", "Art. N" etc.
    article_pattern = re.compile(
        r'(?=ARTÍCULO\s+\d+|Artículo\s+\d+|ARTICULO\s+\d+)',
        re.IGNORECASE
    )
    articles = article_pattern.split(text)

    current_chunk = ""

    for article in articles:
        article = article.strip()
        if not article:
            continue

        article_words = article.split()

        # Si el artículo cabe en el chunk actual, agregarlo
        if len(current_chunk.split()) + len(article_words) <= chunk_size:
            current_chunk += " " + article
        else:
            # Guardar el chunk actual si tiene contenido
            if current_chunk.strip():
                chunks.append(current_chunk.strip())

            # Si el artículo es más largo que chunk_size, dividirlo
            if len(article_words) > chunk_size:
                words = article_words
                i = 0
                while i < len(words):
                    chunk_words = words[i:i + chunk_size]
                    chunks.append(" ".join(chunk_words))
                    i += chunk_size - overlap  # avanzar con overlap
                current_chunk = ""
            else:
                # Overlap: últimas 'overlap' palabras del chunk anterior
                prev_words = current_chunk.split()
                overlap_text = " ".join(prev_words[-overlap:]) if prev_words else ""
                current_chunk = overlap_text + " " + article

    # Último chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    # Filtrar chunks muy cortos (menos de 50 palabras — probablemente encabezados)
    chunks = [c for c in chunks if len(c.split()) >= 50]

    return chunks


def clean_chunk(text):
    """Limpia y normaliza un fragmento de texto."""
    # Colapsar múltiples espacios/saltos de línea
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = text.strip()
    return text


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(PDF_DIR, exist_ok=True)

    all_chunks = []
    total_skipped = 0

    print(f"\nNormaLis RAG — Preparación de fragmentos")
    print(f"{'='*50}")
    print(f"Directorio PDFs: {PDF_DIR}")
    print(f"Tamaño fragmento: {CHUNK_SIZE} palabras | Overlap: {OVERLAP} palabras\n")

    for pdf_file, source_name in PDFS:
        pdf_path = os.path.join(PDF_DIR, pdf_file)

        if not os.path.exists(pdf_path):
            print(f"  OMITIDO: {pdf_file} — no encontrado en {PDF_DIR}")
            total_skipped += 1
            continue

        print(f"Procesando: {pdf_file}")
        try:
            text = extract_text_from_pdf(pdf_path)
            print(f"  Texto extraído: {len(text):,} caracteres")

            chunks = split_into_chunks(text)
            print(f"  Fragmentos generados: {len(chunks)}")

            for i, chunk in enumerate(chunks):
                chunk_clean = clean_chunk(chunk)
                all_chunks.append({
                    "id":          f"{pdf_file.replace('.pdf', '')}_{i:04d}",
                    "text":        chunk_clean,
                    "source":      source_name,
                    "chunk_index": i,
                    "word_count":  len(chunk_clean.split())
                })

        except Exception as e:
            print(f"  ERROR procesando {pdf_file}: {e}")

    print(f"\n{'='*50}")
    print(f"Total fragmentos: {len(all_chunks)}")
    print(f"PDFs omitidos: {total_skipped}")

    if not all_chunks:
        print("\nWARNING: No se generaron fragmentos.")
        print(f"Coloca los PDFs en: {PDF_DIR}")
        print("Nombres esperados:", [p[0] for p in PDFS])
        return

    # Guardar chunks.json
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\nGuardado en: {OUTPUT}")
    print(f"Siguiente paso: python scripts/upload_embeddings.py")

    # Mostrar muestra
    if all_chunks:
        print(f"\nEjemplo del primer fragmento:")
        print(f"  ID: {all_chunks[0]['id']}")
        print(f"  Fuente: {all_chunks[0]['source']}")
        print(f"  Palabras: {all_chunks[0]['word_count']}")
        print(f"  Texto: {all_chunks[0]['text'][:200]}...")


if __name__ == "__main__":
    main()
