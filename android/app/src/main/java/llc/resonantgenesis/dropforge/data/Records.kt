package llc.resonantgenesis.dropforge.data

import kotlinx.serialization.Serializable

@Serializable
data class StagedFile(
    val id: String,
    val repo: String,
    val path: String,
    val bytes: Long,
    val kind: String,
    val license: String? = null,
    val params: Long? = null,
    val detectedQuant: String? = null,
    val localName: String? = null,
    val stagedAt: Long = 0L,
)

@Serializable
data class ModelHit(
    val id: String,
    val downloads: Long = 0,
    val license: String? = null,
    val params: Long? = null,
    val gated: Boolean = false,
    val pipeline: String? = null,
)

@Serializable
data class RemoteFile(
    val path: String,
    val bytes: Long,
    val kind: String,
)
