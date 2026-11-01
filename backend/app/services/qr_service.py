import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm

# Standard 6 Machine Configuration
PRIMARY_MACHINES_CONFIG = [
    {"qr_id": "QR-001", "machine_id": "RMC-01", "machine_name": "RMC VFFS Machine 1", "machine_type": "RMC", "heads": 2},
    {"qr_id": "QR-002", "machine_id": "RMC-02", "machine_name": "RMC VFFS Machine 2", "machine_type": "RMC", "heads": 2},
    {"qr_id": "QR-003", "machine_id": "SMP-01", "machine_name": "Samarpan Integrus 1", "machine_type": "Samarpan", "heads": 2},
    {"qr_id": "QR-004", "machine_id": "SMP-02", "machine_name": "Samarpan Integrus 2", "machine_type": "Samarpan", "heads": 2},
    {"qr_id": "QR-005", "machine_id": "SMP-03", "machine_name": "Samarpan Integrus 3", "machine_type": "Samarpan", "heads": 2},
    {"qr_id": "QR-006", "machine_id": "ATM-01", "machine_name": "Atomic Engineers 1", "machine_type": "Atomic Engineers", "heads": 2},
]

QR_OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "assets", "machine-qr"))

def get_qr_output_dir() -> str:
    os.makedirs(QR_OUTPUT_DIR, exist_ok=True)
    return QR_OUTPUT_DIR

def build_qr_payload(machine_id: str, qr_id: str, version: int = 1) -> str:
    payload = {
        "type": "AAVIN_MACHINE",
        "version": version,
        "machine_id": machine_id,
        "qr_id": qr_id,
        "plant": "AAVIN_MADURAI_DAIRY",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    return json.dumps(payload, separators=(',', ':'))

def generate_single_qr_png(
    qr_id: str,
    machine_id: str,
    machine_name: str,
    machine_type: str,
    version: int = 1,
    output_dir: Optional[str] = None
) -> str:
    """
    Generates an individual high-resolution machine QR code with human-readable labels.
    """
    out_dir = output_dir or get_qr_output_dir()
    os.makedirs(out_dir, exist_ok=True)
    file_name = f"{qr_id}_{machine_id}.png"
    file_path = os.path.join(out_dir, file_name)

    payload_text = build_qr_payload(machine_id, qr_id, version)

    # 1. Generate QR matrix
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(payload_text)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0A192F", back_color="#FFFFFF").convert("RGB")

    # 2. Build badge image with labels
    qr_w, qr_h = qr_img.size
    card_w = qr_w + 60
    card_h = qr_h + 160

    card = Image.new("RGB", (card_w, card_h), color="#FFFFFF")
    draw = ImageDraw.Draw(card)

    # Top banner bar
    draw.rectangle([0, 0, card_w, 40], fill="#0A73C0")
    # Border
    draw.rectangle([0, 0, card_w - 1, card_h - 1], outline="#0A73C0", width=3)

    # Simple text drawing using default font
    try:
        font_title = ImageFont.truetype("arial.ttf", 16)
        font_code = ImageFont.truetype("arialbd.ttf", 24)
        font_sub = ImageFont.truetype("arial.ttf", 12)
        font_footer = ImageFont.truetype("arial.ttf", 10)
    except Exception:
        font_title = font_code = font_sub = font_footer = ImageFont.load_default()

    # Draw Header text
    draw.text((card_w // 2, 20), "AAVIN AALUMAI MACHINE ID", fill="#FFFFFF", anchor="mm", font=font_title)

    # Paste QR Code
    card.paste(qr_img, (30, 50))

    # Bottom labels
    y_text = 50 + qr_h + 10
    draw.text((card_w // 2, y_text), machine_id, fill="#0A73C0", anchor="mm", font=font_code)
    draw.text((card_w // 2, y_text + 24), f"{machine_name} ({machine_type})", fill="#1E293B", anchor="mm", font=font_sub)
    draw.text((card_w // 2, y_text + 44), f"Identifier: {qr_id} • v{version} • Dual Production Heads", fill="#64748B", anchor="mm", font=font_footer)
    draw.text((card_w // 2, y_text + 62), "Scan to identify machine and record shift counter", fill="#059669", anchor="mm", font=font_footer)

    card.save(file_path, format="PNG", dpi=(300, 300))
    return file_path

def generate_all_machine_qrs(output_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Generates all 6 machine QR PNGs and returns metadata.
    """
    out_dir = output_dir or get_qr_output_dir()
    results = []
    for m in PRIMARY_MACHINES_CONFIG:
        path = generate_single_qr_png(
            qr_id=m["qr_id"],
            machine_id=m["machine_id"],
            machine_name=m["machine_name"],
            machine_type=m["machine_type"],
            version=1,
            output_dir=out_dir
        )
        results.append({
            **m,
            "file_path": path,
            "file_name": os.path.basename(path),
            "payload": build_qr_payload(m["machine_id"], m["qr_id"], 1)
        })
    return results

def generate_printable_pdf_sheet(output_pdf_path: Optional[str] = None) -> str:
    """
    Generates a printable A4 PDF sticker sheet with all 6 machine QR codes arranged in a 2x3 grid.
    """
    out_dir = get_qr_output_dir()
    pdf_path = output_pdf_path or os.path.join(out_dir, "AAVIN_MACHINE_QR_SHEET.pdf")

    # Ensure individual PNGs are generated
    qr_data = generate_all_machine_qrs(out_dir)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=18,
        textColor=colors.HexColor('#0A73C0'),
        alignment=1
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569'),
        alignment=1
    )
    card_title_style = ParagraphStyle(
        'CardTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        textColor=colors.HexColor('#0A73C0'),
        alignment=1
    )
    card_meta_style = ParagraphStyle(
        'CardMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#334155'),
        alignment=1
    )
    card_qr_style = ParagraphStyle(
        'CardQrCode',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=9,
        textColor=colors.HexColor('#059669'),
        alignment=1
    )

    elements = []

    # Title & Subtitle
    elements.append(Paragraph("AAVIN AALUMAI - MACHINE QR IDENTIFICATION SHEET", title_style))
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("Madurai District Cooperative Milk Producers' Union Ltd. • VFFS Pouch Machine Ledger", subtitle_style))
    elements.append(Paragraph("Printable Weather-Resistant Machine Identification Stickers • Attach securely to HMI console", subtitle_style))
    elements.append(Spacer(1, 5 * mm))

    # Build 2-column grid of 6 cards
    grid_cells = []
    for item in qr_data:
        img_path = item["file_path"]
        img = RLImage(img_path, width=70 * mm, height=58 * mm)
        card_content = [
            img,
            Spacer(1, 2 * mm),
            Paragraph(f"<b>{item['machine_id']}</b> - {item['machine_type']}", card_title_style),
            Paragraph(f"{item['machine_name']} (2 Heads)", card_meta_style),
            Paragraph(f"Sticker Ref: <b>{item['qr_id']}</b> (v1)", card_qr_style),
        ]
        grid_cells.append(card_content)

    # 3 rows, 2 columns
    table_data = [
        [grid_cells[0], grid_cells[1]],
        [grid_cells[2], grid_cells[3]],
        [grid_cells[4], grid_cells[5]],
    ]

    table = Table(table_data, colWidths=[92 * mm, 92 * mm])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#CBD5E1')),
        ('BOX', (1, 0), (1, 0), 1, colors.HexColor('#CBD5E1')),
        ('BOX', (0, 1), (0, 1), 1, colors.HexColor('#CBD5E1')),
        ('BOX', (1, 1), (1, 1), 1, colors.HexColor('#CBD5E1')),
        ('BOX', (0, 2), (0, 2), 1, colors.HexColor('#CBD5E1')),
        ('BOX', (1, 2), (1, 2), 1, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(table)
    doc.build(elements)
    return pdf_path

def parse_and_validate_qr(qr_text: str) -> Dict[str, Any]:
    """
    Parses and validates a scanned QR code text string.
    Supports structured JSON format and direct QR-ID / Machine-ID string fallbacks.
    """
    clean_text = qr_text.strip()
    if not clean_text:
        return {"valid": False, "error": "Empty QR code data"}

    # Attempt JSON parse
    try:
        data = json.loads(clean_text)
        if isinstance(data, dict):
            if data.get("type") == "AAVIN_MACHINE" and "machine_id" in data:
                return {
                    "valid": True,
                    "machine_id": data["machine_id"],
                    "qr_id": data.get("qr_id", ""),
                    "version": data.get("version", 1),
                    "raw": clean_text
                }
    except Exception:
        pass

    # Direct code match fallback (e.g. "RMC-01" or "QR-001" or "AAVIN://.../RMC-01/...")
    for m in PRIMARY_MACHINES_CONFIG:
        if m["machine_id"] in clean_text or m["qr_id"] in clean_text:
            return {
                "valid": True,
                "machine_id": m["machine_id"],
                "qr_id": m["qr_id"],
                "version": 1,
                "raw": clean_text
            }

    # Backward-compatible mappings
    if "SAMARPAN-01" in clean_text:
        return {"valid": True, "machine_id": "SMP-01", "qr_id": "QR-003", "version": 1, "raw": clean_text}
    if "SAMARPAN-02" in clean_text:
        return {"valid": True, "machine_id": "SMP-02", "qr_id": "QR-004", "version": 1, "raw": clean_text}
    if "SAMARPAN-03" in clean_text:
        return {"valid": True, "machine_id": "SMP-03", "qr_id": "QR-005", "version": 1, "raw": clean_text}
    if "ATOMIC-01" in clean_text:
        return {"valid": True, "machine_id": "ATM-01", "qr_id": "QR-006", "version": 1, "raw": clean_text}

    return {"valid": False, "error": "Unrecognized or unregistered QR code format"}
