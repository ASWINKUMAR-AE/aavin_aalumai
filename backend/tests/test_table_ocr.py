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


def test_parse_hmi_display_text_live_stream():
    from app.services.ocr_table_parser import parse_hmi_display_text

    raw_stream = """OAELTA
START
HEAD - A
SAMARPAN
HEAD - B
MACHINESPEED
MACHINESPEED
START
SET
50
SET
65
HOME
ACTUAL
0
ACTUAL
0
HOME
SEALER
ON
FEED TIME
0.10
FEED TIME
0.10
SEALER
RECIPE No.
3
RECIPE No.
2
ON
PULLER
OFF
1000rnl
500ML
PULLER
PRODUCTION
WASTAGE
PRODUCTION
OFF
FEEDER
WASTAGE
OFF
229910
1212
376761
2491
FEEDER
OFF
SELECTION
SETTINGS
MANUAL MODE
ADV. SETTINGS
CoM 3 Station 1: Communication Error 3
Dsp
HEAD -'A
18/10/2026 07:31"""

    res = parse_hmi_display_text(raw_stream)
    assert res["success"] is True
    assert res["machine_detected"] == "SAMARPAN"
    assert res["hmi_brand"] == "DELTA"
    assert res["display_timestamp"] == "18/10/2026 07:31"
    assert "Communication Error 3" in res["comm_status"]

    # Head A
    assert res["head_a"]["production_counter"] == 229910
    assert res["head_a"]["wastage_counter"] == 1212
    assert res["head_a"]["product_variant"] == "1000ml"
    assert res["head_a"]["machine_speed"] == 50
    assert res["head_a"]["feed_time"] == "0.10"
    assert res["head_a"]["recipe_number"] == 3

    # Head B
    assert res["head_b"]["production_counter"] == 376761
    assert res["head_b"]["wastage_counter"] == 2491
    assert res["head_b"]["product_variant"] == "500ML"
    assert res["head_b"]["machine_speed"] == 65
    assert res["head_b"]["feed_time"] == "0.10"
    assert res["head_b"]["recipe_number"] == 2


