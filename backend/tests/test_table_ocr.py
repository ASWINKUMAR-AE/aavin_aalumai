import pytest
from app.services.ocr_table_parser import auto_enter_fields_from_table_rows


def test_auto_enter_fields_from_bilingual_table():
    sample_table = {
        "success": True,
        "rows": [
            ["ஆங்கில உைரையாடல்கள்"],
            ["S.No", "தமிழ்", "ENGLISH"],
            ["1", "அங்கேயே காத்திரு.", "Wait there."],
            ["2", "அசையாமல் நில்.", "Stand still."],
            ["3", "அட கடவுளே!", "Oh my god!"],
        ],
        "row_count": 5,
        "column_count": 3,
        "processing_time": 4.2,
    }

    result = auto_enter_fields_from_table_rows(sample_table)
    assert result["success"] is True
    assert result["title"] == "ஆங்கில உைரையாடல்கள்"
    assert result["headers"] == ["S.No", "தமிழ்", "ENGLISH"]
    assert len(result["records"]) == 3
    assert result["records"][0]["fields"]["S.No"] == "1"
    assert result["records"][0]["fields"]["தமிழ்"] == "அங்கேயே காத்திரு."
    assert result["records"][0]["fields"]["ENGLISH"] == "Wait there."
    assert result["detected_type"] == "bilingual_table"


def test_auto_enter_fields_from_aavin_abstract_table():
    sample_aavin = {
        "success": True,
        "rows": [
            ["GA1301", "", "", "", ""],
            ["THE MADURAI DISTRICT CO-OPERATIVE MILK PRODUCERS' UNION LTD."],
            ["DATE 21.10.2026 SHIFT: EVENING"],
            ["NO.", "TYPE OF PRODUCT", "QTY (LTR)", "QTY (PKT)", "TRAY"],
            ["1", "COW MILK 500 ML", "30245.750", "60491", "2520.11"],
            ["2", "STANDARDISED MILK 500 ML", "15120.000", "30240", "1260.00"],
            ["", "MILK TOTAL", "45365.750", "90731", "3780.11"],
        ],
        "row_count": 7,
        "column_count": 5,
    }

    result = auto_enter_fields_from_table_rows(sample_aavin)
    assert result["success"] is True
    assert result["detected_type"] == "aavin_abstract"
    assert result["aavin_abstract"] is not None
    assert result["aavin_abstract"]["shift"] == "EVENING"
    assert len(result["aavin_abstract"]["products"]) == 2
    assert result["aavin_abstract"]["products"][0]["product_name"] == "COW MILK 500 ML"
    assert result["aavin_abstract"]["products"][0]["qty_packets"] == 60491
    assert result["aavin_abstract"]["products"][0]["qty_litres"] == 30245.750
