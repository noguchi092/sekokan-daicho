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

/** Writes a separate JPEG containing the visible board. The unmodified capture stays on disk. */
object BoardRenderer {
    fun render(original: File, finished: File, board: Board?) {
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
                if (board != null) drawBoard(canvas, output.width.toFloat(), output.height.toFloat(), board)
                FileOutputStream(finished).use { if (!output.compress(Bitmap.CompressFormat.JPEG, 92, it)) error("写真を保存できません") }
            } finally { output.recycle() }
        } finally { upright.recycle() }
    }
    private fun drawBoard(canvas: Canvas, w: Float, h: Float, board: Board) {
        val width = w * .58f
        val height = (width * .68f).coerceAtMost(h * .42f)
        val left = w - width - w * .035f
        val top = h - height - h * .045f
        val rowHeight = (height * .75f / (board.rows.size + 1)).coerceAtMost(height * .20f)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Color.rgb(11, 91, 61)
        canvas.drawRoundRect(RectF(left, top, left + width, top + height), width * .018f, width * .018f, paint)
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
    }
}
