package com.example.game

import android.opengl.GLES20
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

class GpuMesh(
    val vboId: Int,
    val iboId: Int,
    val indexCount: Int,
) {
    fun draw(posHandle: Int, normalHandle: Int, uvHandle: Int) {
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, vboId)
        GLES20.glBindBuffer(GLES20.GL_ELEMENT_ARRAY_BUFFER, iboId)

        val stride = 8 * 4
        GLES20.glEnableVertexAttribArray(posHandle)
        GLES20.glVertexAttribPointer(posHandle, 3, GLES20.GL_FLOAT, false, stride, 0)

        GLES20.glEnableVertexAttribArray(normalHandle)
        GLES20.glVertexAttribPointer(normalHandle, 3, GLES20.GL_FLOAT, false, stride, 3 * 4)

        GLES20.glEnableVertexAttribArray(uvHandle)
        GLES20.glVertexAttribPointer(uvHandle, 2, GLES20.GL_FLOAT, false, stride, 6 * 4)

        GLES20.glDrawElements(GLES20.GL_TRIANGLES, indexCount, GLES20.GL_UNSIGNED_SHORT, 0)
    }

    fun dispose() {
        GLES20.glDeleteBuffers(2, intArrayOf(vboId, iboId), 0)
    }
}

class MeshLibrary {
    val unitBox: GpuMesh
    val trackBedPlane: GpuMesh
    val brickWallBox: GpuMesh
    val unitPlaneXZ: GpuMesh
    val unitPlaneXY: GpuMesh
    val cylinder: GpuMesh
    val cone: GpuMesh
    val sphere: GpuMesh
    val capDome: GpuMesh
    val torus: GpuMesh
    val halfTorus: GpuMesh
    val octahedron: GpuMesh
    val foliagePoly: GpuMesh

    private val allMeshes = mutableListOf<GpuMesh>()

    init {
        unitBox = buildBox(1f, 1f)
        trackBedPlane = buildPlaneXZ(1f, 6f)
        brickWallBox = buildBox(4f, 1f)
        unitPlaneXZ = buildPlaneXZ(1f, 1f)
        unitPlaneXY = buildPlaneXY()
        cylinder = buildCylinder(16)
        cone = buildCone(14)
        sphere = buildSphere(14, 10, 1.0f)
        capDome = buildSphere(14, 7, 0.55f)
        torus = buildTorus(1.0f, 0.25f, 16, 8, (2.0 * PI).toFloat())
        halfTorus = buildTorus(1.0f, 0.30f, 16, 8, PI.toFloat())
        octahedron = buildOctahedron()
        foliagePoly = buildSphere(7, 5, 1.0f)
    }

    fun dispose() {
        allMeshes.forEach { it.dispose() }
        allMeshes.clear()
    }

    private fun upload(vertices: FloatArray, indices: ShortArray): GpuMesh {
        val vboBuf = ByteBuffer.allocateDirect(vertices.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(vertices)
        vboBuf.position(0)

        val iboBuf = ByteBuffer.allocateDirect(indices.size * 2)
            .order(ByteOrder.nativeOrder())
            .asShortBuffer()
            .put(indices)
        iboBuf.position(0)

        val buffers = IntArray(2)
        GLES20.glGenBuffers(2, buffers, 0)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, buffers[0])
        GLES20.glBufferData(GLES20.GL_ARRAY_BUFFER, vertices.size * 4, vboBuf, GLES20.GL_STATIC_DRAW)

        GLES20.glBindBuffer(GLES20.GL_ELEMENT_ARRAY_BUFFER, buffers[1])
        GLES20.glBufferData(GLES20.GL_ELEMENT_ARRAY_BUFFER, indices.size * 2, iboBuf, GLES20.GL_STATIC_DRAW)

        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, 0)
        GLES20.glBindBuffer(GLES20.GL_ELEMENT_ARRAY_BUFFER, 0)

        val mesh = GpuMesh(buffers[0], buffers[1], indices.size)
        allMeshes.add(mesh)
        return mesh
    }

    private fun buildBox(uvRepeatX: Float, uvRepeatY: Float): GpuMesh {
        val h = 0.5f
        val v = floatArrayOf(
            // Front (+Z)
            -h, -h, h, 0f, 0f, 1f, 0f, uvRepeatY,
            h, -h, h, 0f, 0f, 1f, uvRepeatX, uvRepeatY,
            h, h, h, 0f, 0f, 1f, uvRepeatX, 0f,
            -h, h, h, 0f, 0f, 1f, 0f, 0f,
            // Back (-Z)
            h, -h, -h, 0f, 0f, -1f, 0f, uvRepeatY,
            -h, -h, -h, 0f, 0f, -1f, uvRepeatX, uvRepeatY,
            -h, h, -h, 0f, 0f, -1f, uvRepeatX, 0f,
            h, h, -h, 0f, 0f, -1f, 0f, 0f,
            // Right (+X)
            h, -h, h, 1f, 0f, 0f, 0f, uvRepeatY,
            h, -h, -h, 1f, 0f, 0f, uvRepeatX, uvRepeatY,
            h, h, -h, 1f, 0f, 0f, uvRepeatX, 0f,
            h, h, h, 1f, 0f, 0f, 0f, 0f,
            // Left (-X)
            -h, -h, -h, -1f, 0f, 0f, 0f, uvRepeatY,
            -h, -h, h, -1f, 0f, 0f, uvRepeatX, uvRepeatY,
            -h, h, h, -1f, 0f, 0f, uvRepeatX, 0f,
            -h, h, -h, -1f, 0f, 0f, 0f, 0f,
            // Top (+Y)
            -h, h, h, 0f, 1f, 0f, 0f, uvRepeatY,
            h, h, h, 0f, 1f, 0f, uvRepeatX, uvRepeatY,
            h, h, -h, 0f, 1f, 0f, uvRepeatX, 0f,
            -h, h, -h, 0f, 1f, 0f, 0f, 0f,
            // Bottom (-Y)
            -h, -h, -h, 0f, -1f, 0f, 0f, uvRepeatY,
            h, -h, -h, 0f, -1f, 0f, uvRepeatX, uvRepeatY,
            h, -h, h, 0f, -1f, 0f, uvRepeatX, 0f,
            -h, -h, h, 0f, -1f, 0f, 0f, 0f,
        )
        val idx = ShortArray(36)
        for (f in 0 until 6) {
            val base = (f * 4).toShort()
            val o = f * 6
            idx[o] = base
            idx[o + 1] = (base + 1).toShort()
            idx[o + 2] = (base + 2).toShort()
            idx[o + 3] = base
            idx[o + 4] = (base + 2).toShort()
            idx[o + 5] = (base + 3).toShort()
        }
        return upload(v, idx)
    }

    private fun buildPlaneXZ(uvX: Float, uvY: Float): GpuMesh {
        val h = 0.5f
        val v = floatArrayOf(
            -h, 0f, h, 0f, 1f, 0f, 0f, uvY,
            h, 0f, h, 0f, 1f, 0f, uvX, uvY,
            h, 0f, -h, 0f, 1f, 0f, uvX, 0f,
            -h, 0f, -h, 0f, 1f, 0f, 0f, 0f,
        )
        val idx = shortArrayOf(0, 1, 2, 0, 2, 3)
        return upload(v, idx)
    }

    private fun buildPlaneXY(): GpuMesh {
        val h = 0.5f
        val v = floatArrayOf(
            -h, -h, 0f, 0f, 0f, 1f, 0f, 1f,
            h, -h, 0f, 0f, 0f, 1f, 1f, 1f,
            h, h, 0f, 0f, 0f, 1f, 1f, 0f,
            -h, h, 0f, 0f, 0f, 1f, 0f, 0f,
        )
        val idx = shortArrayOf(0, 1, 2, 0, 2, 3)
        return upload(v, idx)
    }

    private fun buildCylinder(segments: Int): GpuMesh {
        val verts = ArrayList<Float>()
        val inds = ArrayList<Short>()

        fun addVert(x: Float, y: Float, z: Float, nx: Float, ny: Float, nz: Float, u: Float, v: Float) {
            verts.add(x); verts.add(y); verts.add(z)
            verts.add(nx); verts.add(ny); verts.add(nz)
            verts.add(u); verts.add(v)
        }

        // Side ring
        for (i in 0..segments) {
            val u = i.toFloat() / segments
            val a = (u * 2.0 * PI).toFloat()
            val c = cos(a)
            val s = sin(a)
            addVert(c * 0.5f, 0.5f, s * 0.5f, c, 0f, s, u, 0f)
            addVert(c * 0.5f, -0.5f, s * 0.5f, c, 0f, s, u, 1f)
        }
        for (i in 0 until segments) {
            val a = (i * 2).toShort()
            val b = (i * 2 + 1).toShort()
            val c = (i * 2 + 2).toShort()
            val d = (i * 2 + 3).toShort()
            inds.add(a); inds.add(b); inds.add(d)
            inds.add(a); inds.add(d); inds.add(c)
        }

        // Top & bottom caps
        val topCenter = (verts.size / 8).toShort()
        addVert(0f, 0.5f, 0f, 0f, 1f, 0f, 0.5f, 0.5f)
        for (i in 0..segments) {
            val a = (i.toFloat() / segments * 2.0 * PI).toFloat()
            val c = cos(a) * 0.5f
            val s = sin(a) * 0.5f
            addVert(c, 0.5f, s, 0f, 1f, 0f, 0.5f + c, 0.5f + s)
        }
        for (i in 0 until segments) {
            inds.add(topCenter)
            inds.add((topCenter + 1 + i + 1).toShort())
            inds.add((topCenter + 1 + i).toShort())
        }

        val botCenter = (verts.size / 8).toShort()
        addVert(0f, -0.5f, 0f, 0f, -1f, 0f, 0.5f, 0.5f)
        for (i in 0..segments) {
            val a = (i.toFloat() / segments * 2.0 * PI).toFloat()
            val c = cos(a) * 0.5f
            val s = sin(a) * 0.5f
            addVert(c, -0.5f, s, 0f, -1f, 0f, 0.5f + c, 0.5f + s)
        }
        for (i in 0 until segments) {
            inds.add(botCenter)
            inds.add((botCenter + 1 + i).toShort())
            inds.add((botCenter + 1 + i + 1).toShort())
        }

        return upload(verts.toFloatArray(), inds.toShortArray())
    }

    private fun buildCone(segments: Int): GpuMesh {
        val verts = ArrayList<Float>()
        val inds = ArrayList<Short>()
        fun addVert(x: Float, y: Float, z: Float, nx: Float, ny: Float, nz: Float, u: Float, v: Float) {
            verts.add(x); verts.add(y); verts.add(z)
            verts.add(nx); verts.add(ny); verts.add(nz)
            verts.add(u); verts.add(v)
        }

        for (i in 0..segments) {
            val u = i.toFloat() / segments
            val a = (u * 2.0 * PI).toFloat()
            val c = cos(a)
            val s = sin(a)
            val ny = 0.45f
            val len = sqrt(c * c + ny * ny + s * s)
            addVert(0f, 0.5f, 0f, c / len, ny / len, s / len, u, 0f)
            addVert(c * 0.5f, -0.5f, s * 0.5f, c / len, ny / len, s / len, u, 1f)
        }
        for (i in 0 until segments) {
            val top = (i * 2).toShort()
            val b1 = (i * 2 + 1).toShort()
            val b2 = (i * 2 + 3).toShort()
            inds.add(top); inds.add(b2); inds.add(b1)
        }
        val center = (verts.size / 8).toShort()
        addVert(0f, -0.5f, 0f, 0f, -1f, 0f, 0.5f, 0.5f)
        for (i in 0..segments) {
            val a = (i.toFloat() / segments * 2.0 * PI).toFloat()
            addVert(cos(a) * 0.5f, -0.5f, sin(a) * 0.5f, 0f, -1f, 0f, 0.5f, 0.5f)
        }
        for (i in 0 until segments) {
            inds.add(center)
            inds.add((center + 1 + i).toShort())
            inds.add((center + 1 + i + 1).toShort())
        }
        return upload(verts.toFloatArray(), inds.toShortArray())
    }

    private fun buildSphere(slices: Int, stacks: Int, thetaFrac: Float): GpuMesh {
        val verts = ArrayList<Float>()
        val inds = ArrayList<Short>()
        val maxPhi = (PI * thetaFrac).toFloat()
        for (stack in 0..stacks) {
            val v = stack.toFloat() / stacks
            val phi = v * maxPhi
            val y = cos(phi) * 0.5f
            val r = sin(phi) * 0.5f
            for (slice in 0..slices) {
                val u = slice.toFloat() / slices
                val theta = (u * 2.0 * PI).toFloat()
                val x = r * cos(theta)
                val z = r * sin(theta)
                val nx = sin(phi) * cos(theta)
                val ny = cos(phi)
                val nz = sin(phi) * sin(theta)
                verts.add(x); verts.add(y); verts.add(z)
                verts.add(nx); verts.add(ny); verts.add(nz)
                verts.add(u); verts.add(v)
            }
        }
        val row = slices + 1
        for (st in 0 until stacks) {
            for (sl in 0 until slices) {
                val a = (st * row + sl).toShort()
                val b = ((st + 1) * row + sl).toShort()
                val c = ((st + 1) * row + sl + 1).toShort()
                val d = (st * row + sl + 1).toShort()
                inds.add(a); inds.add(b); inds.add(c)
                inds.add(a); inds.add(c); inds.add(d)
            }
        }
        return upload(verts.toFloatArray(), inds.toShortArray())
    }

    private fun buildTorus(majorR: Float, minorR: Float, segMaj: Int, segMin: Int, arc: Float): GpuMesh {
        val verts = ArrayList<Float>()
        val inds = ArrayList<Short>()
        for (i in 0..segMaj) {
            val u = i.toFloat() / segMaj
            val theta = u * arc
            val ct = cos(theta)
            val st = sin(theta)
            for (j in 0..segMin) {
                val v = j.toFloat() / segMin
                val phi = (v * 2.0 * PI).toFloat()
                val cp = cos(phi)
                val sp = sin(phi)
                val x = (majorR + minorR * cp) * ct
                val y = (majorR + minorR * cp) * st
                val z = minorR * sp
                val nx = cp * ct
                val ny = cp * st
                val nz = sp
                verts.add(x); verts.add(y); verts.add(z)
                verts.add(nx); verts.add(ny); verts.add(nz)
                verts.add(u); verts.add(v)
            }
        }
        val row = segMin + 1
        for (i in 0 until segMaj) {
            for (j in 0 until segMin) {
                val a = (i * row + j).toShort()
                val b = ((i + 1) * row + j).toShort()
                val c = ((i + 1) * row + j + 1).toShort()
                val d = (i * row + j + 1).toShort()
                inds.add(a); inds.add(b); inds.add(c)
                inds.add(a); inds.add(c); inds.add(d)
            }
        }
        return upload(verts.toFloatArray(), inds.toShortArray())
    }

    private fun buildOctahedron(): GpuMesh {
        val verts = ArrayList<Float>()
        val inds = ArrayList<Short>()
        val top = floatArrayOf(0f, 0.5f, 0f)
        val bot = floatArrayOf(0f, -0.5f, 0f)
        val ring = arrayOf(
            floatArrayOf(0.5f, 0f, 0f),
            floatArrayOf(0f, 0f, 0.5f),
            floatArrayOf(-0.5f, 0f, 0f),
            floatArrayOf(0f, 0f, -0.5f),
        )
        fun addTri(a: FloatArray, b: FloatArray, c: FloatArray) {
            val ux = b[0] - a[0]; val uy = b[1] - a[1]; val uz = b[2] - a[2]
            val vx = c[0] - a[0]; val vy = c[1] - a[1]; val vz = c[2] - a[2]
            var nx = uy * vz - uz * vy
            var ny = uz * vx - ux * vz
            var nz = ux * vy - uy * vx
            val l = sqrt(nx * nx + ny * ny + nz * nz).coerceAtLeast(1e-5f)
            nx /= l; ny /= l; nz /= l
            val base = (verts.size / 8).toShort()
            for (p in arrayOf(a, b, c)) {
                verts.add(p[0]); verts.add(p[1]); verts.add(p[2])
                verts.add(nx); verts.add(ny); verts.add(nz)
                verts.add(0.5f); verts.add(0.5f)
            }
            inds.add(base); inds.add((base + 1).toShort()); inds.add((base + 2).toShort())
        }
        for (i in 0 until 4) {
            val next = (i + 1) % 4
            addTri(top, ring[next], ring[i])
            addTri(bot, ring[i], ring[next])
        }
        return upload(verts.toFloatArray(), inds.toShortArray())
    }
}
