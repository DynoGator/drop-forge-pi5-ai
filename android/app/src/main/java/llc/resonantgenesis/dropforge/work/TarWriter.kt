package llc.resonantgenesis.dropforge.work

import java.io.File
import java.io.OutputStream

class TarWriter(private val out: OutputStream) {
    fun file(name: String, data: ByteArray, mode: Int = 0o644) {
        require(name.length <= 100) { "Path too long: $name" }
        val header = ByteArray(512)
        writeString(header, 0, name, 100)
        writeOctal(header, 100, mode.toLong(), 8)
        writeOctal(header, 108, 0, 8)
        writeOctal(header, 116, 0, 8)
        writeOctal(header, 124, data.size.toLong(), 12)
        writeOctal(header, 136, System.currentTimeMillis() / 1000, 12)
        for (i in 148 until 156) header[i] = 0x20
        header[156] = '0'.code.toByte()
        writeString(header, 257, "ustar", 5)
        header[262] = 0
        writeString(header, 263, "00", 2)
        writeString(header, 265, "dropforge", 32)
        writeString(header, 297, "dropforge", 32)
        var sum = 0
        for (b in header) sum += b.toInt() and 0xff
        val chk = sum.toString(8).padStart(6, '0')
        for (i in 0 until 6) header[148 + i] = chk[i].code.toByte()
        header[154] = 0
        header[155] = 0x20
        out.write(header)
        out.write(data)
        val pad = (512 - (data.size % 512)) % 512
        if (pad > 0) out.write(ByteArray(pad))
    }

    fun file(name: String, source: File, mode: Int = 0o644) {
        source.inputStream().use { input ->
            val size = source.length()
            require(name.length <= 100)
            val header = headerFor(name, size, mode)
            out.write(header)
            input.copyTo(out)
            val pad = (512 - (size % 512)) % 512
            if (pad > 0) out.write(ByteArray(pad.toInt()))
        }
    }

    fun close() {
        out.write(ByteArray(1024))
        out.flush()
    }

    private fun headerFor(name: String, size: Long, mode: Int): ByteArray {
        val header = ByteArray(512)
        writeString(header, 0, name, 100)
        writeOctal(header, 100, mode.toLong(), 8)
        writeOctal(header, 108, 0, 8)
        writeOctal(header, 116, 0, 8)
        writeOctal(header, 124, size, 12)
        writeOctal(header, 136, System.currentTimeMillis() / 1000, 12)
        for (i in 148 until 156) header[i] = 0x20
        header[156] = '0'.code.toByte()
        writeString(header, 257, "ustar", 5)
        header[262] = 0
        writeString(header, 263, "00", 2)
        writeString(header, 265, "dropforge", 32)
        writeString(header, 297, "dropforge", 32)
        var sum = 0
        for (b in header) sum += b.toInt() and 0xff
        val chk = sum.toString(8).padStart(6, '0')
        for (i in 0 until 6) header[148 + i] = chk[i].code.toByte()
        header[154] = 0
        header[155] = 0x20
        return header
    }

    private fun writeString(buf: ByteArray, offset: Int, value: String, length: Int) {
        val bytes = value.encodeToByteArray()
        bytes.copyInto(buf, offset, 0, minOf(bytes.size, length))
    }

    private fun writeOctal(buf: ByteArray, offset: Int, value: Long, length: Int) {
        val digits = length - 1
        val s = value.toString(8).padStart(digits, '0').takeLast(digits)
        for (i in 0 until digits) buf[offset + i] = s[i].code.toByte()
        buf[offset + length - 1] = 0
    }
}
