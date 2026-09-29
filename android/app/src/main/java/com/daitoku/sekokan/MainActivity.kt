package com.daitoku.sekokan

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.camera.core.UseCaseGroup
import androidx.camera.core.ViewPort
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import android.util.Rational
import java.io.File
import java.util.concurrent.Executors
import kotlin.math.roundToInt
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val ink = Color(0xFF123C3E)
private val green = Color(0xFF0B5B3D)
private val paper = Color(0xFFF3F6F5)

class MainActivity : ComponentActivity() {
    private val store by lazy { LocalStore(this) }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = ink, secondary = green)) {
                App(store, this)
            }
        }
    }
}

@Composable
private fun App(store: LocalStore, activity: ComponentActivity) {
    var revision by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    fun commit() { store.save(); revision++ }
    var siteId by remember { mutableStateOf(store.sites.firstOrNull()?.id.orEmpty()) }
    var folderId by remember { mutableStateOf(store.folders.firstOrNull { it.siteId == siteId }?.id.orEmpty()) }
    var boardId by remember { mutableStateOf<String?>(null) }
    var screen by remember { mutableStateOf("home") }
    var editing by remember { mutableStateOf<Board?>(null) }
    var viewed by remember { mutableStateOf<Photo?>(null) }
    var message by remember { mutableStateOf("") }
    val currentSite = store.sites.find { it.id == siteId }
    val boards = store.boards.filter { it.siteId == siteId }
    val currentBoard = boards.find { it.id == boardId }
    val folder = store.folders.find { it.id == folderId }
    val photos = store.photos.filter { it.siteId == siteId && it.folderId == folderId }.sortedByDescending { it.createdAt }
    val cameraPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) screen = "camera" else message = "カメラの使用を許可してください"
    }
    val context = LocalContext.current
    LaunchedEffect(siteId) {
        if (store.folders.none { it.id == folderId && it.siteId == siteId }) folderId = store.folders.firstOrNull { it.siteId == siteId }?.id.orEmpty()
        if (store.boards.none { it.id == boardId && it.siteId == siteId }) boardId = null
    }
    if (screen == "camera") {
        CameraScreen(activity, store, currentBoard, siteId, folderId, onBack = { screen = "home" }, onSaved = { commit(); message = "写真を保存しました"; screen = "home" }, onError = { message = it })
        return
    }
    Scaffold(topBar = {
        Row(Modifier.fillMaxWidth().background(ink).padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("セコカン台帳", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f))
            if (screen != "home") TextButton(onClick = { screen = "home" }) { Text("戻る", color = Color.White) }
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().background(paper).padding(padding).padding(16.dp)) {
            if (message.isNotBlank()) Text(message, color = green, modifier = Modifier.padding(bottom = 10.dp))
            when (screen) {
                "home" -> {
                    Text("現場・保存先", fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    Dropdown("現場", store.sites, siteId, { it.id }, { it.name }) { siteId = it; message = "" }
                    TextButton(onClick = { screen = "site_new" }) { Text("＋ 現場を追加") }
                    Dropdown("写真フォルダー", store.folders.filter { it.siteId == siteId }, folderId, { it.id }, { it.name }) { folderId = it }
                    Row { TextButton(onClick = { screen = "folder_new" }) { Text("＋ フォルダーを追加") }; TextButton(onClick = { screen = "folders" }) { Text("一覧を見る") } }
                    Spacer(Modifier.height(10.dp))
                    Text("撮影用黒板", fontWeight = FontWeight.Bold)
                    Dropdown("黒板を選択", listOf<Board?>(null) + boards, boardId ?: "", { it?.id ?: "" }, { it?.name ?: "黒板なし" }) { boardId = it.ifEmpty { null } }
                    TextButton(onClick = { editing = null; screen = "board_edit" }) { Text("＋ 黒板新規作成") }
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = {
                        when {
                            siteId.isEmpty() || folderId.isEmpty() -> message = "保存フォルダーを選んでください"
                            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED -> screen = "camera"
                            else -> cameraPermission.launch(Manifest.permission.CAMERA)
                        }
                    }, modifier = Modifier.fillMaxWidth().height(56.dp)) { Text("写真を撮影", fontSize = 18.sp) }
                    Spacer(Modifier.height(18.dp))
                    Row {
                        OutlinedButton(onClick = { screen = "gallery" }, modifier = Modifier.weight(1f)) { Text("写真 ${photos.size}枚") }
                        Spacer(Modifier.width(8.dp))
                        OutlinedButton(onClick = { screen = "boards" }, modifier = Modifier.weight(1f)) { Text("黒板一覧") }
                    }
                    Text("${currentSite?.name.orEmpty()} / ${folder?.name.orEmpty()}", color = Color.Gray, modifier = Modifier.padding(top = 12.dp))
                }
                "site_new" -> NameEditor("現場を追加", "現場名") { name ->
                    val site = Site(LocalStore.newId(), name)
                    store.sites += site; siteId = site.id; val f = PhotoFolder(LocalStore.newId(), site.id, "工事写真"); store.folders += f; folderId = f.id; boardId = null; commit(); screen = "home"
                }
                "folder_new" -> NameEditor("写真フォルダーを追加", "フォルダー名") { name ->
                    val f = PhotoFolder(LocalStore.newId(), siteId, name, folderId.ifBlank { null }); store.folders += f; folderId = f.id; commit(); screen = "home"
                }
                "folders" -> {
                    Text("写真フォルダー", fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    LazyColumn { items(store.folders.filter { it.siteId == siteId }) { f ->
                        val depth = if (f.parentId == null) "" else "　↳ "
                        ListItem(headlineContent = { Text(depth + f.name) }, supportingContent = { Text("${store.photos.count { it.folderId == f.id }}枚") }, modifier = Modifier.clickable { folderId = f.id; screen = "home" })
                    } }
                }
                "board_edit" -> BoardEditor(editing, onSave = { name, layout, fields, note ->
                    val board = Board(editing?.id ?: LocalStore.newId(), siteId, name, layout, fields, note)
                    if (editing == null) store.boards += board else { store.boards.removeAll { it.id == board.id }; store.boards += board }
                    boardId = board.id; commit(); screen = "boards"
                })
                "boards" -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("黒板一覧", fontWeight = FontWeight.Bold, fontSize = 22.sp, modifier = Modifier.weight(1f))
                        TextButton(onClick = { editing = null; screen = "board_edit" }) { Text("＋ 新規") }
                    }
                    LazyColumn { items(boards) { b ->
                        Column(Modifier.fillMaxWidth().padding(vertical = 6.dp).background(Color.White, RoundedCornerShape(10.dp)).padding(12.dp)) {
                            Text(b.name, fontWeight = FontWeight.Bold)
                            Text(b.rows.joinToString(" / ") { "${it.first}: ${it.second}" }, fontSize = 12.sp)
                            Row {
                                TextButton(onClick = { boardId = b.id; screen = "home" }) { Text("撮影に使う") }
                                TextButton(onClick = { editing = b; screen = "board_edit" }) { Text("編集") }
                                TextButton(onClick = { editing = b.copy(id = LocalStore.newId(), name = b.name + " のコピー"); screen = "board_edit" }) { Text("複製") }
                            }
                        }
                    } }
                }
                "gallery" -> {
                    Text("${folder?.name.orEmpty()} の写真", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                    if (photos.isEmpty()) Text("写真はまだありません", modifier = Modifier.padding(top = 24.dp))
                    LazyColumn { items(photos) { p ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp).background(Color.White, RoundedCornerShape(10.dp)).clickable { viewed = p; screen = "photo" }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            val bitmap = remember(p.finished, revision) { BitmapFactory.decodeFile(p.finished) }
                            if (bitmap != null) Image(bitmap.asImageBitmap(), null, Modifier.size(90.dp), contentScale = ContentScale.Crop)
                            Spacer(Modifier.width(12.dp))
                            Column { Text(java.text.SimpleDateFormat("yyyy/MM/dd HH:mm", java.util.Locale.JAPAN).format(p.createdAt)); Text(if (p.boardId == null) "黒板なし" else "黒板付き", color = green) }
                        }
                    } }
                }
                "photo" -> {
                    val p = viewed
                    var verification by remember(p?.id, revision) { mutableStateOf("未照合") }
                    val bitmap = remember(p?.finished, revision) { p?.finished?.let { BitmapFactory.decodeFile(it) } }
                    if (bitmap != null) Image(bitmap.asImageBitmap(), "撮影写真", Modifier.fillMaxWidth().weight(1f), contentScale = ContentScale.Fit)
                    Text(if (p?.boardId != null) "撮影時の黒板を写真に焼き込んで保存しました。この写真は編集できません。" else "黒板なしの写真", color = Color.Gray)
                    if (p != null) {
                        OutlinedButton(onClick = { scope.launch { verification = "照合中…"; verification = withContext(Dispatchers.IO) { try { PhotoIntegrity.verify(p) } catch (e: Exception) { "確認不可：${e.message}" } } } }) { Text("端末内で照合") }
                        Text(verification, color = if (verification.startsWith("不一致")) Color.Red else green)
                    }
                    if (p != null && p.boardId == null) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        for ((clockwise, label) in listOf(false to "↶ 左に90°", true to "↷ 右に90°")) {
                            OutlinedButton(onClick = { scope.launch {
                                try {
                                    val hash = withContext(Dispatchers.IO) {
                                        val status = PhotoIntegrity.verify(p)
                                        if (p.sha256 != null && !status.startsWith("一致")) error(status)
                                        BoardRenderer.rotatePair(File(p.original), File(p.finished), clockwise)
                                        PhotoIntegrity.sha256(File(p.finished))
                                    }
                                    val index = store.photos.indexOfFirst { it.id == p.id }
                                    if (index >= 0) { store.photos[index] = p.copy(sha256 = hash); viewed = store.photos[index] }
                                    commit()
                                } catch (e: Exception) { message = "回転できません: ${e.message}" }
                            } }) { Text(label) }
                        }
                    }
                    TextButton(onClick = { screen = "gallery" }) { Text("写真一覧へ") }
                }
            }
        }
    }
}

@Composable
private fun <T> Dropdown(label: String, values: List<T>, selected: String, key: (T) -> String, title: (T) -> String, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Text(label, fontWeight = FontWeight.SemiBold)
    Box {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
            Text(values.find { key(it) == selected }?.let(title) ?: "選択してください", modifier = Modifier.weight(1f))
            Text("▾")
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            values.forEach { v -> DropdownMenuItem(text = { Text(title(v)) }, onClick = { onSelect(key(v)); expanded = false }) }
        }
    }
}

@Composable
private fun NameEditor(title: String, label: String, save: (String) -> Unit) {
    var value by remember { mutableStateOf("") }
    Text(title, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    OutlinedTextField(value, { value = it }, label = { Text(label) }, modifier = Modifier.fillMaxWidth())
    Button(onClick = { save(value.trim()) }, enabled = value.isNotBlank(), modifier = Modifier.padding(top = 12.dp)) { Text("保存") }
}

@Composable
private fun BoardEditor(initial: Board?, onSave: (String, Int, List<Pair<String, String>>, String) -> Unit) {
    var name by remember(initial?.id) { mutableStateOf(initial?.name.orEmpty()) }
    var layout by remember(initial?.id) { mutableIntStateOf(initial?.layout ?: 1) }
    var note by remember(initial?.id) { mutableStateOf(initial?.note.orEmpty()) }
    val labels = remember(initial?.id) { mutableStateListOf(*Array(5) { initial?.rows?.getOrNull(it)?.first ?: "項目${it + 1}" }) }
    val values = remember(initial?.id) { mutableStateListOf(*Array(5) { initial?.rows?.getOrNull(it)?.second.orEmpty() }) }
    LazyColumn {
        item { Text(if (initial == null) "黒板新規作成" else "黒板編集", fontSize = 22.sp, fontWeight = FontWeight.Bold) }
        item { Text("1. レイアウト選択", modifier = Modifier.padding(top = 12.dp)) }
        item { Dropdown("記入欄の数", (1..5).toList(), layout.toString(), { it.toString() }, { "$it 項目＋備考" }) { layout = it.toInt() } }
        item { Text("2. 内容記入", modifier = Modifier.padding(top = 12.dp)) }
        item { OutlinedTextField(name, { name = it }, label = { Text("工事名・黒板名") }, modifier = Modifier.fillMaxWidth()) }
        items(layout) { i ->
            OutlinedTextField(labels[i], { labels[i] = it }, label = { Text("項目${i + 1}の見出し") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(values[i], { values[i] = it }, label = { Text("内容${i + 1}") }, modifier = Modifier.fillMaxWidth())
        }
        item { OutlinedTextField(note, { note = it }, label = { Text("備考") }, modifier = Modifier.fillMaxWidth()) }
        item { Button(onClick = { onSave(name.trim(), layout, (0 until layout).map { labels[it].trim() to values[it].trim() }, note.trim()) }, enabled = name.isNotBlank(), modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp)) { Text("3. 完了・保存") } }
    }
}

@Suppress("DEPRECATION")
@Composable
private fun CameraScreen(activity: ComponentActivity, store: LocalStore, board: Board?, siteId: String, folderId: String, onBack: () -> Unit, onSaved: () -> Unit, onError: (String) -> Unit) {
    val context = LocalContext.current
    val orientation = LocalConfiguration.current.orientation
    val capture = remember { ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY).build() }
    val providerFuture = remember { ProcessCameraProvider.getInstance(context) }
    val worker = remember { Executors.newSingleThreadExecutor() }
    var busy by remember { mutableStateOf(false) }
    var boardLeft by remember(board?.id) { mutableFloatStateOf(.385f) }
    var boardTop by remember(board?.id) { mutableFloatStateOf(.55f) }
    var boardHeightFraction by remember(board?.id) { mutableFloatStateOf(.25f) }
    DisposableEffect(Unit) {
        val oldFlags = activity.window.decorView.systemUiVisibility
        val oldOrientation = activity.requestedOrientation
        activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
        activity.window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        onDispose { activity.requestedOrientation = oldOrientation; activity.window.decorView.systemUiVisibility = oldFlags; if (providerFuture.isDone) providerFuture.get().unbindAll(); worker.shutdown() }
    }
    BoxWithConstraints(Modifier.fillMaxSize().background(Color.Black)) {
        key(orientation) { AndroidView(factory = { ctx ->
            PreviewView(ctx).apply {
                scaleType = PreviewView.ScaleType.FILL_CENTER
                val previewView = this
                var bound = false
                fun bindWhenReady() {
                    if (bound || width == 0 || height == 0 || !providerFuture.isDone) return
                    try {
                        val provider = providerFuture.get()
                        val viewport = previewView.viewPort ?: ViewPort.Builder(
                            Rational(width, height), previewView.display?.rotation ?: 0
                        ).setScaleType(ViewPort.FILL_CENTER).build()
                        provider.unbindAll()
                        capture.targetRotation = previewView.display?.rotation ?: android.view.Surface.ROTATION_0
                        val preview = Preview.Builder().build().also { it.targetRotation = capture.targetRotation; it.surfaceProvider = surfaceProvider }
                        val group = UseCaseGroup.Builder().setViewPort(viewport)
                            .addUseCase(preview).addUseCase(capture).build()
                        provider.bindToLifecycle(activity, CameraSelector.DEFAULT_BACK_CAMERA, group)
                        bound = true
                    } catch (e: Exception) { onError("カメラを起動できません: ${e.message}"); onBack() }
                }
                addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> bindWhenReady() }
                providerFuture.addListener({
                    previewView.post { bindWhenReady() }
                }, ContextCompat.getMainExecutor(ctx))
            }
        }, modifier = Modifier.fillMaxSize()) }
        if (board != null) {
            val boardWidth = maxWidth * .58f
            val boardHeight = (boardWidth * .68f).coerceAtMost(maxHeight * .42f)
            val heightFraction = if (maxHeight.value > 0f) {
                (boardHeight.value / maxHeight.value).coerceIn(0f, 1f)
            } else .25f
            val density = LocalDensity.current
            val screenWidthPx = with(density) { maxWidth.toPx() }
            val screenHeightPx = with(density) { maxHeight.toPx() }
            SideEffect { boardHeightFraction = heightFraction }
            Column(Modifier.align(Alignment.TopStart)
                .offset { IntOffset((boardLeft.coerceIn(0f, .42f) * screenWidthPx).roundToInt(),
                    (boardTop.coerceIn(0f, 1f - heightFraction) * screenHeightPx).roundToInt()) }
                .width(boardWidth).height(boardHeight)
                .pointerInput(board.id, screenWidthPx, screenHeightPx, heightFraction) {
                    detectDragGestures { change, delta ->
                        change.consume()
                        boardLeft = (boardLeft + delta.x / screenWidthPx).coerceIn(0f, .42f)
                        boardTop = (boardTop + delta.y / screenHeightPx).coerceIn(0f, 1f - heightFraction)
                    }
                }
                .clip(RoundedCornerShape(5.dp)).background(green).padding(7.dp)) {
                Text("工事名  ${board.name}", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                board.rows.forEach { (label, value) -> HorizontalDivider(color = Color.White); Text("$label  $value", color = Color.White, fontSize = 12.sp, maxLines = 1) }
                HorizontalDivider(color = Color.White)
                Text(board.note, color = Color.White, fontSize = 11.sp, maxLines = 2)
                Text("セコカン台帳", color = Color.White, fontSize = 10.sp, modifier = Modifier.align(Alignment.End))
            }
            Text("黒板を指で移動できます", color = Color.White,
                modifier = Modifier.align(Alignment.TopCenter).padding(top = 16.dp)
                    .background(Color.Black.copy(alpha = .45f), RoundedCornerShape(8.dp)).padding(8.dp))
        }
        TextButton(onClick = onBack, modifier = Modifier.align(Alignment.TopStart).padding(16.dp).background(Color.Black.copy(alpha = .45f), RoundedCornerShape(10.dp))) { Text("✕ 戻る", color = Color.White) }
        Row(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(Color.Black.copy(alpha = .6f)).padding(18.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Button(onClick = {
                busy = true
                val id = LocalStore.newId()
                val original = store.newPhotoFile(id, true)
                val finished = store.newPhotoFile(id, false)
                // Freeze the drag position at shutter time; the JPEG callback runs on a worker.
                val placement = if (board == null) null else BoardPlacement(
                    boardLeft.coerceIn(0f, .42f), boardTop.coerceIn(0f, 1f - boardHeightFraction),
                    .58f, boardHeightFraction
                )
                capture.takePicture(ImageCapture.OutputFileOptions.Builder(original).build(), worker, object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                        try {
                            BoardRenderer.render(original, finished, board, placement)
                            val sha256 = PhotoIntegrity.sha256(finished)
                            if (board != null) original.delete()
                            val savedPath = if (board == null) original.absolutePath else finished.absolutePath
                            activity.runOnUiThread { store.photos += Photo(id, siteId, folderId, board?.id, savedPath, finished.absolutePath, System.currentTimeMillis(), sha256); onSaved() }
                        } catch (e: Exception) { finished.delete(); activity.runOnUiThread { busy = false; onError("保存できません: ${e.message}") } }
                    }
                    override fun onError(exception: androidx.camera.core.ImageCaptureException) { original.delete(); activity.runOnUiThread { busy = false; onError("撮影できません: ${exception.message}") } }
                })
            }, enabled = !busy, modifier = Modifier.size(82.dp), shape = RoundedCornerShape(50), contentPadding = PaddingValues(0.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.White)) {
                Text(if (busy) "保存中" else "●", color = ink, fontSize = if (busy) 12.sp else 42.sp)
            }
        }
    }
}
