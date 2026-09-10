<?php
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
@ini_set('html_errors', '0');
@error_reporting(0);
@set_time_limit(600);
@ini_set('memory_limit', '256M');
@ob_start();

$_json_sent = false;

function _json($data, $code = 200) {
    global $_json_sent;
    $_json_sent = true;
    while (ob_get_level()) @ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    $out = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($out === false) $out = '{"error":"Failed to encode response"}';
    echo $out;
    exit;
}

register_shutdown_function(function() {
    global $_json_sent;
    if ($_json_sent) return;
    while (ob_get_level()) @ob_end_clean();
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    $e = error_get_last();
    $msg = $e ? $e['message'] : 'Unknown server error';
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $msg]);
    exit;
});

$imp_pdo = null;

function _db() {
    global $imp_pdo;
    if ($imp_pdo === null) {
        require_once __DIR__ . '/config.php';
        $imp_pdo = getDB();
    }
    return $imp_pdo;
}

function _v($r, $i) {
    if ($i < 0 || !isset($r[$i])) return '';
    $v = $r[$i];
    return is_string($v) ? trim($v) : (is_scalar($v) ? (string)$v : '');
}

function _n($r, $i) {
    if ($i < 0 || !isset($r[$i])) return 0;
    $v = $r[$i];
    if (is_numeric($v)) return floatval($v);
    if (is_string($v)) { $v = trim($v); return $v === '' ? 0 : floatval($v); }
    return 0;
}

function _fc($h, $p) {
    foreach ($p as $x) {
        $xl = strtolower($x);
        foreach ($h as $i => $v) {
            if (stripos($v, $xl) !== false) return $i;
        }
    }
    return -1;
}

function _dt($v) {
    if (!$v) return null;
    $v = trim($v);
    if (is_numeric($v)) return date('Y-m-d', strtotime('1899-12-30') + ((int)$v * 86400));
    foreach (['Y-m-d', 'm/d/Y', 'Y/m/d', 'd-m-Y', 'm-d-Y'] as $f) {
        $p = DateTime::createFromFormat($f, $v);
        if ($p !== false) return $p->format('Y-m-d');
    }
    $p = strtotime($v);
    return $p !== false ? date('Y-m-d', $p) : null;
}

function _csv($file) {
    $d = [];
    $h = @fopen($file, 'r');
    if (!$h) throw new Exception('Cannot open CSV file');
    $first = true;
    while (($r = @fgetcsv($h, 0, ',')) !== false) {
        if ($first && !empty($r[0])) {
            $r[0] = preg_replace('/^\xEF\xBB\xBF/', '', $r[0]);
        }
        $first = false;
        $d[] = $r;
    }
    fclose($h);
    return $d;
}

function _xls($file) {
    if (!class_exists('ZipArchive')) throw new Exception('ZipArchive extension not available - cannot process .xlsx files. Try converting to CSV.');
    $z = new ZipArchive();
    if (@$z->open($file) !== true) throw new Exception('Cannot open Excel file (unsupported format or corrupted)');

    $ss = [];
    $ssi = $z->locateName('xl/sharedStrings.xml');
    if ($ssi !== false) {
        $sc = $z->getFromIndex($ssi);
        if ($sc !== false) {
            $sx = @simplexml_load_string($sc);
            if ($sx !== false && isset($sx->si)) {
                foreach ($sx->si as $s) {
                    $t = '';
                    if (isset($s->t)) {
                        foreach ($s->t as $n) $t .= (string)$n;
                    }
                    if ($t === '' && isset($s->r)) {
                        foreach ($s->r as $r) {
                            if (isset($r->t)) $t .= (string)$r->t;
                        }
                    }
                    $ss[] = $t;
                }
            }
        }
    }

    $sheetData = [];
    $sheets = [];
    for ($si = 1; $si <= 50; $si++) {
        $name = 'xl/worksheets/sheet' . $si . '.xml';
        if ($z->locateName($name) === false) break;
        $sheets[] = $name;
    }
    foreach ($sheets as $sheetPath) {
        $wsi = $z->locateName($sheetPath);
        if ($wsi === false) continue;
        $wc = $z->getFromIndex($wsi);
        if ($wc === false) continue;
        $wx = @simplexml_load_string($wc);
        if ($wx === false || !isset($wx->sheetData)) continue;
        foreach ($wx->sheetData->row as $row) {
            $rd = [];
            $isEmpty = true;
            foreach ($row->c as $cell) {
                $ref = (string)$cell['r'];
                $ct = (string)$cell['t'];
                $v = '';
                if (isset($cell->v)) $v = (string)$cell->v;
                elseif (isset($cell->is)) {
                    foreach ($cell->is->t as $n) $v .= (string)$n;
                }
                if ($ct === 's' && is_numeric($v) && isset($ss[(int)$v])) {
                    $v = $ss[(int)$v];
                }
                if (preg_match('/([A-Z]+)(\d+)/', $ref, $m)) {
                    $cn = 0;
                    for ($j = 0; $j < strlen($m[1]); $j++) {
                        $cn = $cn * 26 + (ord($m[1][$j]) - 64);
                    }
                    $rd[$cn - 1] = $v;
                    if ($v !== '') $isEmpty = false;
                }
            }
            if (!empty($rd)) {
                ksort($rd);
                $sheetData[] = array_values($rd);
            }
        }
        if (!empty($sheetData)) break;
    }
    $z->close();
    return $sheetData;
}

try {
    if (empty($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
        _json(['success' => false, 'error' => 'Method not allowed'], 405);
    }
    if (!isset($_FILES['file'])) {
        _json(['success' => false, 'error' => 'No file uploaded'], 400);
    }
    $f = $_FILES['file'];
    $upload_errors = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload_max_filesize limit (' . ini_get('upload_max_filesize') . ')',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form MAX_FILE_SIZE directive',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Server missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Server failed to write file to disk',
        UPLOAD_ERR_EXTENSION  => 'File upload stopped by PHP extension',
    ];
    if ($f['error'] !== UPLOAD_ERR_OK) {
        $msg = isset($upload_errors[$f['error']]) ? $upload_errors[$f['error']] : 'File upload error (code ' . $f['error'] . ')';
        _json(['success' => false, 'error' => $msg], 400);
    }

    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['csv', 'xlsx', 'xls'])) {
        _json(['success' => false, 'error' => 'Invalid file type. Please upload a CSV or Excel (.xlsx/.xls) file.'], 400);
    }

    if ($f['size'] <= 0) {
        _json(['success' => false, 'error' => 'Uploaded file is empty'], 400);
    }

    $data = ($ext === 'csv') ? _csv($f['tmp_name']) : _xls($f['tmp_name']);
    if (!$data || count($data) < 2) {
        _json(['success' => false, 'error' => 'File is empty or has no data rows (need header + at least 1 data row)'], 400);
    }

    $hdrs = array_map('strtolower', array_map('trim', $data[0]));

    $map = [
        'rsbsa_number' => _fc($hdrs, ['rsbsa_number', 'rsbsa no', 'rsbsa no.', 'rsbsa', 'system_generated_rsbsa_number']),
        'last_name'    => _fc($hdrs, ['last name', 'last_name', 'surname', 'lastname', 'family name', 'family_name']),
        'first_name'   => _fc($hdrs, ['first name', 'first_name', 'given name', 'given_name', 'firstname']),
        'middle_name'  => _fc($hdrs, ['middle name', 'middle_name', 'middle initial', 'middle_initial', 'middlename']),
        'extension'    => _fc($hdrs, ['extension', 'name extension', 'name_extension', 'suffix', 'suffix and extension']),
        'sex'          => _fc($hdrs, ['sex', 'gender']),
        'birthdate'    => _fc($hdrs, ['birthdate', 'birth date', 'birth_date', 'dob', 'date of birth', 'bdate']),
        'barangay'     => _fc($hdrs, ['barangay', 'brgy', 'barangay address', 'address 1', 'address_1']),
        'municipality' => _fc($hdrs, ['municipality', 'town', 'city', 'municipality address', 'address 2', 'address_2']),
        'province'     => _fc($hdrs, ['province', 'region', 'province address', 'address 3', 'address_3']),
        'phone'        => _fc($hdrs, ['phone', 'mobile', 'contact', 'contact no', 'contact_no', 'contact number', 'tel', 'telephone']),
        'commodity'    => _fc($hdrs, ['commodity', 'crop', 'crop type', 'crop_type', 'commodity type']),
        'farm_area'    => _fc($hdrs, ['farm area', 'farm_area', 'farm size', 'farm_size', 'area', 'hectares', 'land area', 'land_area']),
    ];

    if (!isset($hdrs[0])) {
        _json(['success' => false, 'error' => 'Could not read header row from file'], 400);
    }

    if ($map['last_name'] < 0 && $map['first_name'] < 0) {
        _json(['success' => false, 'error' => 'Could not find required columns (Last Name / First Name) in the file. Supported column names: Last Name, First Name, RSBSA Number, etc.'], 400);
    }

    $db = _db();
    $stmt_check_rsbsa = $db->prepare("SELECT id FROM farmers WHERE rsbsa_number=?");
    $stmt_check_name  = $db->prepare("SELECT id FROM farmers WHERE name=?");
    $stmt_update      = $db->prepare("UPDATE farmers SET name=?,last_name=?,first_name=?,middle_name=?,extension=?,sex=?,birthdate=?,phone=?,barangay=?,municipality=?,province=?,farm_size=?,farm_size_unit=?,crop_type=?,updated_at=NOW() WHERE rsbsa_number=?");
    $stmt_insert      = $db->prepare("INSERT INTO farmers(rsbsa_number,name,last_name,first_name,middle_name,extension,sex,birthdate,phone,barangay,municipality,province,farm_size,farm_size_unit,crop_type,status)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

    $ok = 0;
    $errs = [];
    $skip = 0;

    $db->beginTransaction();

    try {
        for ($i = 1; $i < count($data); $i++) {
            $r = $data[$i];
            if (!is_array($r) || empty(array_filter($r))) { $skip++; continue; }

            $ln = _v($r, $map['last_name']);
            $fn = _v($r, $map['first_name']);
            $mn = _v($r, $map['middle_name']);
            $ext = _v($r, $map['extension']);

            if (!$ln && !$fn) { $skip++; continue; }

            $nm = trim($mn . ' ' . $fn);
            if ($ln) $nm = $ln . ', ' . $nm;
            if ($ext) $nm .= ', ' . $ext;

            $ph  = _v($r, $map['phone']);
            $fsz = _n($r, $map['farm_area']);
            $ct  = _v($r, $map['commodity']);
            $rsb = _v($r, $map['rsbsa_number']);
            $sx  = _v($r, $map['sex']);
            $bd  = _dt(_v($r, $map['birthdate']));
            $brg = _v($r, $map['barangay']);
            $mun = _v($r, $map['municipality']);
            $prv = _v($r, $map['province']);

            $exist = null;
            if ($rsb) {
                $stmt_check_rsbsa->execute([$rsb]);
                $exist = $stmt_check_rsbsa->fetch();
            }

            try {
                if ($exist) {
                    $stmt_update->execute([$nm, $ln, $fn, $mn, $ext, $sx, $bd, $ph, $brg, $mun, $prv, $fsz, 'hectares', $ct, $rsb]);
                    $ok++;
                } else {
                    $stmt_check_name->execute([$nm]);
                    if ($stmt_check_name->fetch()) { $errs[] = "Row " . ($i + 1) . ": '$nm' already exists"; continue; }
                    $stmt_insert->execute([$rsb, $nm, $ln, $fn, $mn, $ext, $sx, $bd, $ph, $brg, $mun, $prv, $fsz, 'hectares', $ct, 'active']);
                    $ok++;
                }
            } catch (PDOException $e) {
                $errs[] = "Row " . ($i + 1) . ": " . $e->getMessage();
            }
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    _json([
        'success'  => true,
        'message'  => "Successfully imported $ok of " . (count($data) - 1) . " farmers",
        'imported' => $ok,
        'total'    => count($data) - 1,
        'skipped'  => $skip,
        'errors'   => $errs,
    ]);
} catch (Throwable $e) {
    _json(['success' => false, 'error' => 'Import failed: ' . $e->getMessage()], 500);
}

if (!$_json_sent) {
    while (ob_get_level()) @ob_end_clean();
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo '{"success":false,"error":"Server error: Script terminated without response"}';
    exit;
}
