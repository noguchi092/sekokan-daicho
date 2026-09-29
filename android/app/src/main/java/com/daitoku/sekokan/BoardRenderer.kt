package com.daitoku.sekokan

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileOutputStream

/** Renders the visible board directly into the saved JPEG. Capture policy decides whether to retain the source. */
object BoardRenderer {
    fun render(original: File, finished: File, board: Board?, placement: BoardPlacement? = null) {
        val source = BitmapFactory.decodeFile(original.absolutePath) ?: error("写真を読み込めません")
        val angle = when (ExifInterface(original.absolutePath).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }
        val upright = if (angle == 0f) source else Bitmap.createBitmap(source, 0, 0, source.width, source.height, Matrix().apply { postRotate(angle) }, true).also { source.recycle() }
        try {
            val output = Bitmap.createBitmap(upright.width, upright.height, Bitmap.Config.ARGB_8888)
            try {
                val canvas = Canvas(output)
                canvas.drawBitmap(upright, 0f, 0f, null)
                if (board != null && placement != null) drawBoard(canvas, output.width.toFloat(), output.height.toFloat(), board, placement)
                FileOutputStream(finished).use { if (!output.compress(Bitmap.CompressFormat.JPEG, 92, it)) error("写真を保存できません") }
            } finally { output.recycle() }
        } finally { upright.recycle() }
    }
    /** Rotate both stored versions together; restore originals if either write fails. */
    fun rotatePair(original: File, finished: File, clockwise: Boolean) {
        val files = listOf(original, finished).distinctBy { it.absolutePath }
        val backups = files.map { File(it.parentFile, it.name + ".rotate-backup") }
        val drafts = files.map { File(it.parentFile, it.name + ".rotate-draft") }
        try {
            files.forEachIndexed { i, file ->
                require(file.isFile) { "保存された写真が見つかりません" }
                file.copyTo(backups[i], overwrite = true)
                val source = BitmapFactory.decodeFile(file.absolutePath) ?: error("写真を読み込めません")
                val exifAngle = when (ExifInterface(file.absolutePath).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    else -> 0f
                }
                val angle = (exifAngle + if (clockwise) 90f else 270f) % 360f
                val rotated = Bitmap.createBitmap(source, 0, 0, source.width, source.height, Matrix().apply { postRotate(angle) }, true)
                try { FileOutputStream(drafts[i]).use { if (!rotated.compress(Bitmap.CompressFormat.JPEG, 92, it)) error("写真を回転できません") } }
                finally { rotated.recycle(); if (rotated !== source) source.recycle() }
            }
            drafts.forEachIndexed { i, file -> file.copyTo(files[i], overwrite = true) }
        } catch (e: Exception) {
            backups.forEachIndexed { i, backup -> if (backup.exists()) backup.copyTo(files[i], overwrite = true) }
            throw e
        } finally { backups.forEach { it.delete() }; drafts.forEach { it.delete() } }
    }

    private fun drawBoard(canvas: Canvas, w: Float, h: Float, board: Board, placement: BoardPlacement) {
        val width = w * placement.width.coerceIn(0f, 1f)
        val height = h * placement.height.coerceIn(0f, 1f)
        val left = w * placement.left.coerceIn(0f, 1f - width / w)
        val top = h * placement.top.coerceIn(0f, 1f - height / h)
        val rowHeight = (height * .75f / (board.rows.size + 1)).coerceAtMost(height * .20f)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Color.rgb(11, 91, 61)
        canvas.drawRoundRect(RectF(left, top, left + width, top + height), width * .018f, width * .018f, paint)
        canvas.save()
        canvas.clipRect(left, top, left + width, top + height)
        paint.color = Color.WHITE
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = (width * .004f).coerceAtLeast(2f)
        canvas.drawRect(left + width * .018f, top + width * .018f, left + width * .982f, top + height - width * .018f, paint)
        paint.style = Paint.Style.FILL
        paint.textSize = width * .038f
        fun row(index: Int, label: String, value: String) {
            val y = top + rowHeight * (index + 1)
            canvas.drawText(label.take(8), left + width * .035f, y, paint)
            canvas.drawText(value.take(24), left + width * .32f, y, paint)
            paint.style = Paint.Style.STROKE
            canvas.drawLine(left + width * .025f, y + rowHeight * .24f, left + width * .975f, y + rowHeight * .24f, paint)
            paint.style = Paint.Style.FILL
        }
        row(0, "工事名", board.name)
        board.rows.forEachIndexed { index, (label, value) -> row(index + 1, label, value) }
        paint.textSize = width * .032f
        canvas.drawText(board.note.take(26), left + width * .035f, top + height * .87f, paint)
        canvas.drawText("セコカン台帳", left + width * .72f, top + height * .96f, paint)
        canvas.restore()
    }
}

/** Fractions of the visible, cropped camera image (top-left origin). */
data class BoardPlacement(val left: Float, val top: Float, val width: Float, val height: Float)
