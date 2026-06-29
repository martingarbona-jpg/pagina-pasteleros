<?php
$ADMIN_PASSWORD = 'novedades2026';

session_start();

$jsonFile = __DIR__ . '/novedades.json';
$bannersDir = __DIR__ . '/banners';
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
$allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

function h($value) {
  return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function current_version() {
  return date('Y-m-d-H-i-s');
}

function default_data() {
  return [
    'activo' => true,
    'version' => current_version(),
    'items' => [],
  ];
}

function ensure_storage($jsonFile, $bannersDir) {
  if (!is_dir($bannersDir)) {
    mkdir($bannersDir, 0755, true);
  }

  if (!file_exists($jsonFile)) {
    save_data($jsonFile, default_data());
  }
}

function load_data($jsonFile) {
  if (!file_exists($jsonFile)) {
    return default_data();
  }

  $raw = file_get_contents($jsonFile);
  $data = json_decode($raw, true);

  if (!is_array($data)) {
    return default_data();
  }

  if (!isset($data['activo'])) $data['activo'] = true;
  if (!isset($data['version'])) $data['version'] = current_version();
  if (!isset($data['items']) || !is_array($data['items'])) $data['items'] = [];

  return $data;
}

function save_data($jsonFile, $data) {
  $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  if ($json === false) {
    throw new RuntimeException('No se pudo generar el JSON.');
  }

  file_put_contents($jsonFile, $json . PHP_EOL, LOCK_EX);
}

function slug_file_name($name) {
  $name = pathinfo($name, PATHINFO_FILENAME);
  $name = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name);
  $name = strtolower($name ?: 'banner');
  $name = preg_replace('/[^a-z0-9]+/', '-', $name);
  $name = trim($name, '-');
  return $name ?: 'banner';
}

function upload_image($file, $bannersDir, $allowedExtensions, $allowedMimeTypes, $required = true) {
  if (!isset($file) || !is_array($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
    if (!$required) {
      return '';
    }

    throw new RuntimeException('Subí una imagen JPG, PNG o WEBP.');
  }

  if ($file['error'] !== UPLOAD_ERR_OK) {
    throw new RuntimeException('No se pudo subir la imagen.');
  }

  $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
  if (!in_array($extension, $allowedExtensions, true)) {
    throw new RuntimeException('Formato inválido. Usá JPG, PNG o WEBP.');
  }

  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime = $finfo->file($file['tmp_name']);
  if (!in_array($mime, $allowedMimeTypes, true)) {
    throw new RuntimeException('El archivo no parece ser una imagen válida.');
  }

  if (!is_dir($bannersDir)) {
    mkdir($bannersDir, 0755, true);
  }

  $baseName = slug_file_name($file['name']);
  $finalName = $baseName . '-' . date('Ymd-His') . '.' . $extension;
  $target = $bannersDir . '/' . $finalName;

  if (!move_uploaded_file($file['tmp_name'], $target)) {
    throw new RuntimeException('No se pudo guardar la imagen en banners/.');
  }

  return 'banners/' . $finalName;
}

function find_item_index($items, $id) {
  foreach ($items as $index => $item) {
    if (($item['id'] ?? '') === $id) {
      return $index;
    }
  }

  return null;
}

function valid_tipo($tipo) {
  return in_array($tipo, ['banner', 'aviso', 'alerta', 'video', 'pdf'], true) ? $tipo : 'banner';
}

function unique_item_id($items) {
  $base = date('Ymd_His');
  $id = $base;
  $suffix = 1;

  while (find_item_index($items, $id) !== null) {
    $id = $base . '_' . $suffix;
    $suffix++;
  }

  return $id;
}

ensure_storage($jsonFile, $bannersDir);

$error = '';
$notice = '';

if (isset($_GET['logout'])) {
  $_SESSION = [];
  session_destroy();
  header('Location: admin-novedades.php');
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
  if (hash_equals($ADMIN_PASSWORD, (string) ($_POST['password'] ?? ''))) {
    $_SESSION['novedades_admin'] = true;
    header('Location: admin-novedades.php');
    exit;
  }

  $error = 'Contraseña incorrecta.';
}

$loggedIn = !empty($_SESSION['novedades_admin']);

if ($loggedIn && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = $_POST['action'] ?? '';

  if ($action !== 'login') {
    try {
      $data = load_data($jsonFile);

      if ($action === 'crear' || $action === 'guardar_edicion') {
        $tipo = valid_tipo((string) ($_POST['tipo'] ?? 'banner'));
        $titulo = trim((string) ($_POST['titulo'] ?? ''));
        $descripcion = trim((string) ($_POST['descripcion'] ?? ''));
        $linkTexto = trim((string) ($_POST['linkTexto'] ?? ''));
        $link = trim((string) ($_POST['link'] ?? ''));

        if ($titulo === '' || $descripcion === '') {
          throw new RuntimeException('Completá título y descripción.');
        }

        $existingImage = '';
        $index = null;

        if ($action === 'guardar_edicion') {
          $id = (string) ($_POST['id'] ?? '');
          $index = find_item_index($data['items'], $id);

          if ($index === null) {
            throw new RuntimeException('No se encontró la novedad.');
          }

          $existingImage = (string) ($data['items'][$index]['imagen'] ?? '');
        }

        $imagePath = upload_image(
          $_FILES['imagen'] ?? null,
          $bannersDir,
          $allowedExtensions,
          $allowedMimeTypes,
          $tipo === 'banner' && $existingImage === ''
        );

        if ($imagePath === '') {
          $imagePath = $existingImage;
        }

        $item = [
          'id' => $action === 'crear' ? unique_item_id($data['items']) : (string) ($_POST['id'] ?? ''),
          'tipo' => $tipo,
          'titulo' => $titulo,
          'descripcion' => $descripcion,
          'imagen' => $imagePath,
          'linkTexto' => $linkTexto,
          'link' => $link,
          'popup' => isset($_POST['popup']),
          'activo' => isset($_POST['activo']),
        ];

        if ($action === 'crear') {
          $data['items'][] = $item;
          $notice = 'Novedad agregada correctamente.';
        } else {
          $data['items'][$index] = $item;
          $notice = 'Novedad editada correctamente.';
        }

        $data['version'] = current_version();
        save_data($jsonFile, $data);
      }

      if (in_array($action, ['activar', 'desactivar', 'toggle_popup', 'eliminar', 'duplicar'], true)) {
        $id = (string) ($_POST['id'] ?? '');
        $index = find_item_index($data['items'], $id);

        if ($index === null) {
          throw new RuntimeException('No se encontró la novedad.');
        }

        if ($action === 'activar') {
          $data['items'][$index]['activo'] = true;
          $notice = 'Novedad activada.';
        }

        if ($action === 'desactivar') {
          $data['items'][$index]['activo'] = false;
          $notice = 'Novedad desactivada.';
        }

        if ($action === 'toggle_popup') {
          $data['items'][$index]['popup'] = empty($data['items'][$index]['popup']);
          $notice = 'Popup actualizado.';
        }

        if ($action === 'eliminar') {
          array_splice($data['items'], $index, 1);
          $notice = 'Novedad eliminada del JSON. La imagen física no se borró.';
        }

        if ($action === 'duplicar') {
          $copy = $data['items'][$index];
          $copy['id'] = unique_item_id($data['items']);
          $copy['activo'] = false;
          $copy['titulo'] = trim(($copy['titulo'] ?? 'Novedad') . ' (copia)');
          $data['items'][] = $copy;
          $notice = 'Novedad duplicada como inactiva.';
        }

        $data['version'] = current_version();
        save_data($jsonFile, $data);
      }
    } catch (Throwable $e) {
      $error = $e->getMessage();
    }
  }
}

$data = $loggedIn ? load_data($jsonFile) : default_data();
$items = $data['items'] ?? [];
$filter = $_GET['filtro'] ?? 'todas';
if (!in_array($filter, ['todas', 'activas', 'inactivas'], true)) {
  $filter = 'todas';
}

$totalCount = count($items);
$activeCount = count(array_filter($items, function ($item) {
  return !empty($item['activo']);
}));
$inactiveCount = $totalCount - $activeCount;
$filteredItems = array_values(array_filter($items, function ($item) use ($filter) {
  if ($filter === 'activas') return !empty($item['activo']);
  if ($filter === 'inactivas') return empty($item['activo']);
  return true;
}));
$editId = $loggedIn ? (string) ($_GET['editar'] ?? '') : '';
$editIndex = $editId !== '' ? find_item_index($items, $editId) : null;
$editItem = $editIndex === null ? null : $items[$editIndex];
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Novedades</title>
  <style>
    :root{
      --verde-principal:#0f7a43;
      --verde-secundario:#149e5f;
      --fondo:#f5f7f6;
      --texto:#1f2a2a;
      --muted:#667;
      --borde:#e1ebe6;
      --rojo:#c62828;
    }

    *{ box-sizing:border-box; }

    body{
      margin:0;
      font-family:'Segoe UI', Arial, sans-serif;
      color:var(--texto);
      background:
        radial-gradient(900px 500px at 12% 0%, rgba(20,158,95,.16), transparent 60%),
        var(--fondo);
    }

    .admin-top{
      background:linear-gradient(135deg,var(--verde-principal),var(--verde-secundario));
      color:#fff;
      padding:24px 18px;
      box-shadow:0 14px 34px rgba(0,0,0,.14);
    }

    .container{
      width:min(1120px, 100%);
      margin:auto;
      padding:20px;
    }

    .admin-top .container{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      padding-top:0;
      padding-bottom:0;
    }

    h1, h2, h3{ margin:0; }

    .admin-top h1{
      font-size:28px;
      font-weight:900;
    }

    .admin-top p{
      margin:5px 0 0;
      opacity:.9;
      font-weight:700;
    }

    .logout{
      color:#fff;
      text-decoration:none;
      font-weight:900;
      border:1px solid rgba(255,255,255,.55);
      border-radius:999px;
      padding:10px 14px;
    }

    .grid{
      display:grid;
      grid-template-columns:380px 1fr;
      gap:20px;
      align-items:start;
    }

    .card{
      background:#fff;
      border:1px solid var(--borde);
      border-radius:18px;
      padding:20px;
      box-shadow:0 14px 34px rgba(0,0,0,.08);
    }

    .card h2{
      color:var(--verde-principal);
      font-size:22px;
      margin-bottom:14px;
    }

    .muted{ color:var(--muted); }

    .alert{
      border-radius:14px;
      padding:12px 14px;
      margin-bottom:16px;
      font-weight:800;
    }

    .alert--error{
      background:#fff1f1;
      color:var(--rojo);
      border:1px solid #ffd2d2;
    }

    .alert--ok{
      background:#edf9f2;
      color:var(--verde-principal);
      border:1px solid #cdeedb;
    }

    label{
      display:grid;
      gap:7px;
      font-weight:900;
      font-size:14px;
      margin-bottom:13px;
    }

    input[type="text"],
    input[type="url"],
    input[type="password"],
    select,
    textarea{
      width:100%;
      border:1px solid var(--borde);
      border-radius:14px;
      padding:12px 14px;
      font:inherit;
      outline:none;
      background:#fbfdfc;
    }

    textarea{
      min-height:108px;
      resize:vertical;
    }

    input:focus,
    select:focus,
    textarea:focus{
      border-color:var(--verde-principal);
      box-shadow:0 0 0 4px rgba(15,122,67,.12);
      background:#fff;
    }

    input[type="file"]{
      width:100%;
      border:1px dashed rgba(15,122,67,.45);
      border-radius:14px;
      padding:12px;
      background:#f6fbf8;
    }

    .field-hint{
      color:var(--muted);
      font-size:12px;
      font-weight:700;
      line-height:1.35;
    }

    .checks{
      display:flex;
      gap:14px;
      flex-wrap:wrap;
      margin:4px 0 14px;
    }

    .checks label{
      display:flex;
      align-items:center;
      gap:8px;
      margin:0;
    }

    .btn{
      border:none;
      border-radius:999px;
      padding:11px 16px;
      background:var(--verde-principal);
      color:#fff;
      font:inherit;
      font-weight:900;
      cursor:pointer;
      text-decoration:none;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:42px;
    }

    .btn--ghost{
      background:#edf7f1;
      color:var(--verde-principal);
    }

    .btn--danger{
      background:#fff1f1;
      color:var(--rojo);
    }

    .btn-row{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:12px;
    }

    .filters{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin:0 0 16px;
    }

    .filter-link{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:38px;
      padding:8px 13px;
      border-radius:999px;
      background:#eef7f2;
      color:var(--verde-principal);
      text-decoration:none;
      font-weight:900;
      font-size:14px;
    }

    .filter-link.is-active{
      background:var(--verde-principal);
      color:#fff;
    }

    .novedad{
      display:grid;
      grid-template-columns:170px 1fr;
      gap:16px;
      padding:16px 0;
      border-top:1px solid var(--borde);
    }

    .novedad:first-of-type{
      border-top:none;
      padding-top:0;
    }

    .novedad img{
      width:100%;
      aspect-ratio:16 / 10;
      object-fit:contain;
      border-radius:14px;
      background:#f6fbf8;
      border:1px solid var(--borde);
    }

    .novedad-empty-img{
      min-height:112px;
      display:grid;
      place-items:center;
      text-align:center;
      border-radius:14px;
      border:1px dashed rgba(15,122,67,.3);
      background:#f6fbf8;
      color:var(--verde-principal);
      font-weight:900;
      padding:16px;
    }

    .novedad h3{
      color:var(--verde-principal);
      font-size:19px;
      margin-bottom:6px;
    }

    .badges{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin:10px 0 4px;
    }

    .badge{
      border-radius:999px;
      padding:6px 10px;
      font-size:12px;
      font-weight:900;
      background:#eef7f2;
      color:var(--verde-principal);
    }

    .badge--off{
      background:#f2f2f2;
      color:#667;
    }

    .estado{
      display:inline-flex;
      align-items:center;
      gap:8px;
      font-weight:900;
      margin:10px 0 4px;
    }

    .estado__dot{
      width:11px;
      height:11px;
      border-radius:999px;
      background:#b8c0bd;
    }

    .estado--activo .estado__dot{
      background:#10a353;
    }

    .estado--inactivo{
      color:#667;
    }

    .edit-note{
      margin:-4px 0 14px;
      padding:10px 12px;
      border-radius:12px;
      background:#edf7f1;
      color:var(--verde-principal);
      font-weight:800;
      font-size:13px;
    }

    .login-wrap{
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:20px;
    }

    .login-card{
      width:min(420px, 100%);
    }

    @media (max-width:860px){
      .admin-top .container{
        align-items:flex-start;
        flex-direction:column;
      }

      .grid{
        grid-template-columns:1fr;
      }

      .novedad{
        grid-template-columns:1fr;
      }

      .novedad img{
        max-height:260px;
      }

      .btn{
        width:100%;
      }
    }
  </style>
</head>
<body>
<?php if (!$loggedIn): ?>
  <main class="login-wrap">
    <section class="card login-card">
      <h1 style="color:var(--verde-principal);margin-bottom:8px;">Admin Novedades</h1>
      <p class="muted" style="margin-top:0;">Ingresá la contraseña para continuar.</p>

      <?php if ($error): ?>
        <div class="alert alert--error"><?= h($error) ?></div>
      <?php endif; ?>

      <form method="post">
        <input type="hidden" name="action" value="login">
        <label>Contraseña
          <input type="password" name="password" required autofocus>
        </label>
        <button class="btn" type="submit">Ingresar</button>
      </form>
    </section>
  </main>
<?php else: ?>
  <header class="admin-top">
    <div class="container">
      <div>
        <h1>Admin Novedades</h1>
        <p>Versión actual: <?= h($data['version'] ?? '') ?> · <?= count($items) ?> novedad(es)</p>
      </div>
      <a class="logout" href="?logout=1">Cerrar sesión</a>
    </div>
  </header>

  <main class="container">
    <?php if ($error): ?>
      <div class="alert alert--error"><?= h($error) ?></div>
    <?php endif; ?>

    <?php if ($notice): ?>
      <div class="alert alert--ok"><?= h($notice) ?></div>
    <?php endif; ?>

    <div class="grid">
      <section class="card">
        <h2><?= $editItem ? 'Editar novedad' : 'Agregar novedad' ?></h2>
        <?php if ($editItem): ?>
          <div class="edit-note">Editando: <?= h($editItem['titulo'] ?? '') ?> · <a href="admin-novedades.php" style="color:inherit;">cancelar edición</a></div>
        <?php endif; ?>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="action" value="<?= $editItem ? 'guardar_edicion' : 'crear' ?>">
          <?php if ($editItem): ?>
            <input type="hidden" name="id" value="<?= h($editItem['id'] ?? '') ?>">
          <?php endif; ?>

          <label>Tipo
            <select name="tipo" id="tipoNovedad">
              <?php $selectedTipo = valid_tipo($editItem['tipo'] ?? 'banner'); ?>
              <option value="banner" <?= $selectedTipo === 'banner' ? 'selected' : '' ?>>Banner con imagen</option>
              <option value="aviso" <?= $selectedTipo === 'aviso' ? 'selected' : '' ?>>Aviso solo texto</option>
              <option value="alerta" <?= $selectedTipo === 'alerta' ? 'selected' : '' ?>>Alerta importante</option>
              <option value="video" <?= $selectedTipo === 'video' ? 'selected' : '' ?>>Video</option>
              <option value="pdf" <?= $selectedTipo === 'pdf' ? 'selected' : '' ?>>Documento PDF</option>
            </select>
          </label>

          <label>Título
            <input type="text" name="titulo" value="<?= h($editItem['titulo'] ?? '') ?>" required>
          </label>

          <label>Descripción
            <textarea name="descripcion" required><?= h($editItem['descripcion'] ?? '') ?></textarea>
          </label>

          <label>Texto del botón
            <input type="text" name="linkTexto" value="<?= h($editItem['linkTexto'] ?? 'Solicitar turno') ?>">
          </label>

          <label>Link
            <input type="text" name="link" value="<?= h($editItem['link'] ?? 'https://wa.me/5492613434536') ?>">
          </label>

          <label>Imagen JPG, PNG o WEBP
            <input type="file" name="imagen" id="imagenNovedad" data-existing-image="<?= h($editItem['imagen'] ?? '') ?>" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
            <span class="field-hint" id="imagenHint">Obligatoria para banner. Opcional para aviso o alerta.</span>
          </label>

          <div class="checks">
            <label><input type="checkbox" name="popup" <?= !empty($editItem['popup']) ? 'checked' : '' ?>> Popup</label>
            <label><input type="checkbox" name="activo" <?= $editItem ? (!empty($editItem['activo']) ? 'checked' : '') : 'checked' ?>> Activo</label>
          </div>

          <button class="btn" type="submit"><?= $editItem ? 'Guardar cambios' : 'Guardar novedad' ?></button>
        </form>
      </section>

      <section class="card">
        <h2>Novedades existentes</h2>

        <nav class="filters" aria-label="Filtros de novedades">
          <a class="filter-link <?= $filter === 'todas' ? 'is-active' : '' ?>" href="admin-novedades.php?filtro=todas">Todas <?= $totalCount ?></a>
          <a class="filter-link <?= $filter === 'activas' ? 'is-active' : '' ?>" href="admin-novedades.php?filtro=activas">Activas <?= $activeCount ?></a>
          <a class="filter-link <?= $filter === 'inactivas' ? 'is-active' : '' ?>" href="admin-novedades.php?filtro=inactivas">Inactivas <?= $inactiveCount ?></a>
        </nav>

        <?php if (!count($filteredItems)): ?>
          <p class="muted">No hay novedades para este filtro.</p>
        <?php endif; ?>

        <?php foreach ($filteredItems as $item): ?>
          <article class="novedad">
            <div>
              <?php if (!empty($item['imagen'])): ?>
                <img src="<?= h($item['imagen']) ?>" alt="<?= h($item['titulo'] ?? 'Novedad') ?>">
              <?php else: ?>
                <div class="novedad-empty-img">Sin imagen</div>
              <?php endif; ?>
            </div>
            <div>
              <h3><?= h($item['titulo'] ?? '') ?></h3>
              <p class="muted"><?= h($item['descripcion'] ?? '') ?></p>
              <div class="estado <?= !empty($item['activo']) ? 'estado--activo' : 'estado--inactivo' ?>">
                <span class="estado__dot" aria-hidden="true"></span>
                <?= !empty($item['activo']) ? '🟢 Activa' : '⚪ Inactiva' ?>
              </div>
              <p class="muted" style="font-size:13px;margin-bottom:0;">
                ID: <?= h($item['id'] ?? '') ?><br>
                Imagen: <?= h($item['imagen'] ?? '') ?>
              </p>

              <div class="badges">
                <span class="badge"><?= h($item['tipo'] ?? 'banner') ?></span>
                <span class="badge<?= empty($item['activo']) ? ' badge--off' : '' ?>">
                  <?= !empty($item['activo']) ? 'Activa' : 'Inactiva' ?>
                </span>
                <span class="badge<?= empty($item['popup']) ? ' badge--off' : '' ?>">
                  <?= !empty($item['popup']) ? 'Popup' : 'Sin popup' ?>
                </span>
              </div>

              <div class="btn-row">
                <a class="btn btn--ghost" href="admin-novedades.php?editar=<?= h($item['id'] ?? '') ?>">
                  ✏️ Editar
                </a>

                <form method="post">
                  <input type="hidden" name="action" value="<?= !empty($item['activo']) ? 'desactivar' : 'activar' ?>">
                  <input type="hidden" name="id" value="<?= h($item['id'] ?? '') ?>">
                  <button class="btn btn--ghost" type="submit">
                    <?= !empty($item['activo']) ? '⏸️ Desactivar' : '▶️ Activar' ?>
                  </button>
                </form>

                <form method="post">
                  <input type="hidden" name="action" value="duplicar">
                  <input type="hidden" name="id" value="<?= h($item['id'] ?? '') ?>">
                  <button class="btn btn--ghost" type="submit">
                    📋 Duplicar
                  </button>
                </form>

                <form method="post" onsubmit="return confirm('¿Eliminar esta novedad del JSON? La imagen física no se borrará.');">
                  <input type="hidden" name="action" value="eliminar">
                  <input type="hidden" name="id" value="<?= h($item['id'] ?? '') ?>">
                  <button class="btn btn--danger" type="submit">🗑️ Eliminar</button>
                </form>
              </div>
            </div>
          </article>
        <?php endforeach; ?>
      </section>
    </div>
  </main>
<?php endif; ?>
<script>
  const tipoNovedad = document.getElementById('tipoNovedad');
  const imagenNovedad = document.getElementById('imagenNovedad');
  const imagenHint = document.getElementById('imagenHint');

  function actualizarImagenRequerida() {
    if (!tipoNovedad || !imagenNovedad || !imagenHint) return;
    const esBanner = tipoNovedad.value === 'banner';
    const tieneImagenExistente = Boolean(imagenNovedad.dataset.existingImage);
    imagenNovedad.required = esBanner && !tieneImagenExistente;
    imagenHint.textContent = esBanner && !tieneImagenExistente
      ? 'Obligatoria para banner.'
      : esBanner
        ? 'Ya hay una imagen cargada. Subí otra solo si querés reemplazarla.'
      : 'Opcional. Si subís una imagen, se mostrará en la novedad.';
  }

  tipoNovedad?.addEventListener('change', actualizarImagenRequerida);
  actualizarImagenRequerida();
</script>
</body>
</html>
