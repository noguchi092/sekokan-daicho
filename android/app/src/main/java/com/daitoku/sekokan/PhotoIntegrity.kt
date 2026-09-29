package com.daitoku.sekokan

import java.io.File
import java.security.MessageDigest

/** Device-local comparison only; this is not a server-protected authenticity certificate. */
object PhotoIntegrity {
    fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().buffered().use { input ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count == -1) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }

    fun verify(photo: Photo): String {
        if (photo.sha256 == null) return "旧写真：照合記録なし"
        val file = File(photo.finished)
        if (!file.isFile) return "確認不可：写真が見つかりません"
        return if (sha256(file).equals(photo.sha256, ignoreCase = true))
            "一致：端末内の保存時から変更なし" else "不一致：写真の内容が変わっています"
    }
}
