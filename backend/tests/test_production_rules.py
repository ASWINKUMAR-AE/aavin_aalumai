import pytest

def test_normal_counter_delta():
    prev_reading = 840000
    current_reading = 845230
    delta = current_reading - prev_reading
    assert delta == 5230

def test_witnessed_reset_rollover_calculation():
    # Example from Section 13.2 specification:
    # Previous = 998,500, New after reset = 1,200 -> production = 2,700 packets
    prev_reading = 998500
    new_reading = 1200
    reset_threshold = 1000000
    
    reset_production = (reset_threshold - prev_reading) + new_reading
    assert reset_production == 2700

def test_milk_mass_balance_calculation():
    # 20,000 packets of 500ml = 10,000 Litres
    # Milk issued = 10,150 Litres
    # Difference = 150 Litres, loss = 1.48%
    packets = 20000
    pouch_ml = 500
    issued_litres = 10150.0

    expected_litres = (packets * pouch_ml) / 1000.0
    diff_litres = issued_litres - expected_litres
    loss_pct = (diff_litres / issued_litres) * 100.0

    assert expected_litres == 10000.0
    assert diff_litres == 150.0
    assert round(loss_pct, 2) == 1.48

def test_calibration_offset_calculation():
    # Counter delta = 5000, physical packets counted = 5025
    # Offset = +25, offset percentage = 0.5%
    counter_delta = 5000
    physical_count = 5025

    offset = physical_count - counter_delta
    offset_pct = (offset / counter_delta) * 100.0

    assert offset == 25
    assert offset_pct == 0.5
