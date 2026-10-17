package llc.resonantgenesis.dropforge.work

import com.jcraft.jsch.ChannelExec
import com.jcraft.jsch.ChannelSftp
import com.jcraft.jsch.HostKey
import com.jcraft.jsch.HostKeyRepository
import com.jcraft.jsch.JSch
import com.jcraft.jsch.JSchException
import com.jcraft.jsch.Session
import com.jcraft.jsch.SftpProgressMonitor
import com.jcraft.jsch.UserInfo
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.Base64

class NeedTrust(val fingerprint: String) : Exception(fingerprint)

class SshPush {
    fun push(
        host: String,
        port: Int,
        user: String,
        password: String?,
        privateKey: ByteArray?,
        knownFingerprint: String?,
        localTar: File,
        runInstall: Boolean,
        onProgress: (Long, Long) -> Unit,
    ): String {
        val jsch = JSch()
        if (privateKey != null) {
            jsch.addIdentity("dropforge", privateKey, null, null)
        }
        val session = jsch.getSession(user, host, port)
        if (!password.isNullOrEmpty()) session.setPassword(password)
        val repo = PinRepo(knownFingerprint)
        session.hostKeyRepository = repo
        session.setConfig("StrictHostKeyChecking", "yes")
        session.userInfo = object : UserInfo {
            override fun getPassphrase(): String? = null
            override fun getPassword(): String? = password
            override fun promptPassword(message: String?) = !password.isNullOrEmpty()
            override fun promptPassphrase(message: String?) = false
            override fun promptYesNo(message: String?) = false
            override fun showMessage(message: String?) {}
        }
        session.timeout = 20_000
        try {
            session.connect(20_000)
        } catch (err: JSchException) {
            val fp = repo.offered
            if (fp != null && knownFingerprint != fp) throw NeedTrust(fp)
            throw err
        }
        try {
            val sftp = session.openChannel("sftp") as ChannelSftp
            sftp.connect(20_000)
            val monitor = object : SftpProgressMonitor {
                private var max = 1L
                private var sent = 0L
                override fun init(op: Int, src: String?, dest: String?, max: Long) {
                    this.max = if (max > 0) max else localTar.length()
                }
                override fun count(count: Long): Boolean {
                    sent += count
                    onProgress(sent, max)
                    return true
                }
                override fun end() {}
            }
            sftp.put(localTar.absolutePath, "dropforge-kit.tar", monitor, ChannelSftp.OVERWRITE)
            sftp.disconnect()
            if (!runInstall) return "Copied dropforge-kit.tar to $user@$host. Install was not run."
            val exec = session.openChannel("exec") as ChannelExec
            exec.setCommand("tar -xf dropforge-kit.tar && sudo -n sh dropforge-kit/install.sh")
            val stdout = ByteArrayOutputStream()
            val stderr = ByteArrayOutputStream()
            exec.outputStream.use { }
            exec.setErrStream(stderr)
            exec.connect(20_000)
            exec.inputStream.use { it.copyTo(stdout) }
            val deadline = System.currentTimeMillis() + 30 * 60 * 1000
            while (!exec.isClosed && System.currentTimeMillis() < deadline) Thread.sleep(200)
            val code = exec.exitStatus
            exec.disconnect()
            val out = (stdout.toString() + "\n" + stderr.toString()).trim()
            if (code != 0) error("Install exited $code\n$out")
            return out.ifBlank { "Install finished." }
        } finally {
            session.disconnect()
        }
    }
}

private class PinRepo(private val pin: String?) : HostKeyRepository {
    var offered: String? = null
    override fun check(host: String?, key: ByteArray?): Int {
        if (key == null) return HostKeyRepository.NOT_INCLUDED
        val fp = fingerprint(key)
        offered = fp
        if (pin == null) return HostKeyRepository.NOT_INCLUDED
        if (pin != fp) return HostKeyRepository.CHANGED
        return HostKeyRepository.OK
    }
    override fun add(hostkey: HostKey?, ui: UserInfo?) {}
    override fun remove(host: String?, type: String?) {}
    override fun remove(host: String?, type: String?, key: ByteArray?) {}
    override fun getKnownHostsRepositoryID(): String = "dropforge"
    override fun getHostKey(): Array<HostKey> = emptyArray()
    override fun getHostKey(host: String?, type: String?): Array<HostKey> = emptyArray()
}

fun fingerprint(key: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(key)
    return "SHA256:" + Base64.getEncoder().withoutPadding().encodeToString(digest)
}
