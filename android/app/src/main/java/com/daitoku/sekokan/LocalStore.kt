package com.daitoku.sekokan

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

data class Site(val id: String, val name: String)
data class PhotoFolder(val id: String, val siteId: String, val name: String, val parentId: String? = null)
data class Board(val id: String, val siteId: String, val name: String, val layout: Int, val rows: List<Pair<String, String>>, val note: String)
data class Photo(val id: String, val siteId: String, val folderId: String, val boardId: String?, val original: String, val finished: String, val createdAt: Long, val sha256: String? = null)

class LocalStore(private val context: Context) {
    val sites = mutableListOf<Site>()
    val folders = mutableListOf<PhotoFolder>()
    val boards = mutableListOf<Board>()
    val photos = mutableListOf<Photo>()
    private val catalog = File(context.filesDir, "catalog.json")

    init { load() }
    private fun load() {
        if (catalog.exists()) try {
            val root = JSONObject(catalog.readText())
            root.optJSONArray("sites")?.let { a -> repeat(a.length()) { val v = a.getJSONObject(it); sites += Site(v.getString("id"), v.getString("name")) } }
            root.optJSONArray("folders")?.let { a -> repeat(a.length()) { val v = a.getJSONObject(it); folders += PhotoFolder(v.getString("id"), v.getString("siteId"), v.getString("name"), v.optString("parentId").ifBlank { null }) } }
            root.optJSONArray("boards")?.let { a -> repeat(a.length()) { val v = a.getJSONObject(it); val fields = v.getJSONArray("rows"); boards += Board(v.getString("id"), v.getString("siteId"), v.getString("name"), v.getInt("layout"), List(fields.length()) { n -> fields.getJSONObject(n).let { f -> f.getString("label") to f.getString("value") } }, v.optString("note")) } }
            root.optJSONArray("photos")?.let { a -> repeat(a.length()) { val v = a.getJSONObject(it); photos += Photo(v.getString("id"), v.getString("siteId"), v.getString("folderId"), v.optString("boardId").ifBlank { null }, v.getString("original"), v.getString("finished"), v.getLong("createdAt"), v.optString("sha256").ifBlank { null }) } }
        } catch (_: Exception) { /* Keep damaged catalog for manual recovery. */ }
        if (sites.isEmpty() && !catalog.exists()) {
            val site = Site(newId(), "サンプル現場")
            sites += site
            folders += PhotoFolder(newId(), site.id, "工事写真")
            save()
        }
    }
    fun save() {
        val root = JSONObject()
        root.put("sites", JSONArray().apply { sites.forEach { put(JSONObject().put("id", it.id).put("name", it.name)) } })
        root.put("folders", JSONArray().apply { folders.forEach { put(JSONObject().put("id", it.id).put("siteId", it.siteId).put("name", it.name).put("parentId", it.parentId ?: "")) } })
        root.put("boards", JSONArray().apply { boards.forEach { b -> put(JSONObject().put("id", b.id).put("siteId", b.siteId).put("name", b.name).put("layout", b.layout).put("note", b.note).put("rows", JSONArray().apply { b.rows.forEach { (label, value) -> put(JSONObject().put("label", label).put("value", value)) } })) } })
        root.put("photos", JSONArray().apply { photos.forEach { p -> put(JSONObject().put("id", p.id).put("siteId", p.siteId).put("folderId", p.folderId).put("boardId", p.boardId ?: "").put("original", p.original).put("finished", p.finished).put("createdAt", p.createdAt).put("sha256", p.sha256 ?: "")) } })
        val temp = File(context.filesDir, "catalog.tmp")
        temp.writeText(root.toString())
        if (!temp.renameTo(catalog)) { catalog.writeText(temp.readText()); temp.delete() }
    }
    fun newPhotoFile(id: String, original: Boolean): File = File(context.filesDir, "photos/${id}_${if (original) "original" else "board"}.jpg").apply { parentFile?.mkdirs() }
    companion object { fun newId(): String = UUID.randomUUID().toString() }
}
