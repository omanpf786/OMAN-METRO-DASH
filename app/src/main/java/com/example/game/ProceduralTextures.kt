package com.example.game

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.opengl.GLES20
import android.opengl.GLUtils
import kotlin.random.Random

class ProceduralTextures(
    trackBedHex: String,
    wallHex: String,
) {
    val whiteTex: Int
    val trackBed: Int
    val brickWall: Int
    val barrierRedWhite: Int
    val barrierHazard: Int
    val trainSilverBlue: Int
    val trainYellowTeal: Int
    val trainCrimsonWhite: Int
    val contactShadow: Int
    val sparkSprite: Int

    private val allIds = mutableListOf<Int>()

    init {
        whiteTex = uploadBitmap(createWhiteBitmap(), repeat = false)
        trackBed = uploadBitmap(createTrackBedBitmap(trackBedHex), repeat = true)
        brickWall = uploadBitmap(createBrickWallBitmap(wallHex), repeat = true)
        barrierRedWhite = uploadBitmap(createStripeBitmap("#F8FAFC", "#EF4444"), repeat = false)
        barrierHazard = uploadBitmap(createStripeBitmap("#FACC15", "#111827"), repeat = false)
        trainSilverBlue = uploadBitmap(
            createTrainSideBitmap("#CBD5E1", "#1D4ED8", "#FACC15", "#EF4444", "#FACC15"),
            repeat = false,
        )
        trainYellowTeal = uploadBitmap(
            createTrainSideBitmap("#FBBF24", "#0F766E", "#F8FAFC", "#38BDF8", "#FDE047"),
            repeat = false,
        )
        trainCrimsonWhite = uploadBitmap(
            createTrainSideBitmap("#DC2626", "#F8FAFC", "#FACC15", "#10B981", "#FDE047"),
            repeat = false,
        )
        contactShadow = uploadBitmap(createContactShadowBitmap(), repeat = false)
        sparkSprite = uploadBitmap(createSparkSpriteBitmap(), repeat = false)
    }

    fun dispose() {
        if (allIds.isNotEmpty()) {
            GLES20.glDeleteTextures(allIds.size, allIds.toIntArray(), 0)
            allIds.clear()
        }
    }

    private fun uploadBitmap(bmp: Bitmap, repeat: Boolean): Int {
        val ids = IntArray(1)
        GLES20.glGenTextures(1, ids, 0)
        val texId = ids[0]
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texId)
        GLES20.glTexParameteri(
            GLES20.GL_TEXTURE_2D,
            GLES20.GL_TEXTURE_MIN_FILTER,
            GLES20.GL_LINEAR_MIPMAP_LINEAR,
        )
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        val wrap = if (repeat) GLES20.GL_REPEAT else GLES20.GL_CLAMP_TO_EDGE
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, wrap)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, wrap)
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bmp, 0)
        GLES20.glGenerateMipmap(GLES20.GL_TEXTURE_2D)
        bmp.recycle()
        allIds.add(texId)
        return texId
    }

    private fun createWhiteBitmap(): Bitmap {
        val bmp = Bitmap.createBitmap(2, 2, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(Color.WHITE)
        return bmp
    }

    private fun createTrackBedBitmap(trackBedHex: String): Bitmap {
        val bmp = Bitmap.createBitmap(256, 256, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.parseColor(trackBedHex))

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rng = Random(1337)
        for (i in 0 until 650) {
            val gx = rng.nextFloat() * 256f
            val gy = rng.nextFloat() * 256f
            paint.color = if (rng.nextBoolean()) Color.argb(32, 255, 255, 255) else Color.argb(46, 0, 0, 0)
            canvas.drawRect(gx, gy, gx + 3f, gy + 3f, paint)
        }

        // Wooden sleepers
        var y = 12f
        while (y < 256f) {
            paint.color = Color.parseColor("#4A2E1B")
            canvas.drawRect(10f, y, 246f, y + 14f, paint)
            paint.color = Color.parseColor("#6B4226")
            canvas.drawRect(10f, y, 246f, y + 5f, paint)
            y += 32f
        }
        return bmp
    }

    private fun createBrickWallBitmap(wallHex: String): Bitmap {
        val bmp = Bitmap.createBitmap(256, 256, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.parseColor(wallHex))

        val paint = Paint().apply {
            color = Color.argb(56, 0, 0, 0)
            strokeWidth = 3f
            style = Paint.Style.STROKE
        }
        for (row in 0 until 8) {
            val y = row * 32f
            canvas.drawLine(0f, y, 256f, y, paint)
            val offset = (row % 2) * 32f
            for (col in 0 until 5) {
                val x = col * 64f + offset
                canvas.drawLine(x, y, x, y + 32f, paint)
            }
        }
        return bmp
    }

    private fun createStripeBitmap(bgHex: String, stripeHex: String): Bitmap {
        val bmp = Bitmap.createBitmap(256, 64, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.parseColor(bgHex))

        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor(stripeHex)
            style = Paint.Style.FILL
        }
        var x = -64f
        while (x < 320f) {
            val path = Path().apply {
                moveTo(x, 64f)
                lineTo(x + 24f, 64f)
                lineTo(x + 56f, 0f)
                lineTo(x + 32f, 0f)
                close()
            }
            canvas.drawPath(path, paint)
            x += 48f
        }
        return bmp
    }

    private fun createTrainSideBitmap(
        primaryHex: String,
        stripeHex: String,
        accentHex: String,
        graffitiAHex: String,
        graffitiBHex: String,
    ): Bitmap {
        val bmp = Bitmap.createBitmap(512, 256, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.parseColor(primaryHex))

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        // Horizontal ribbing
        paint.color = Color.argb(16, 0, 0, 0)
        var ry = 16f
        while (ry < 245f) {
            canvas.drawRect(0f, ry, 512f, ry + 3f, paint)
            ry += 12f
        }

        // Lower skirt
        paint.color = Color.parseColor("#1E293B")
        canvas.drawRect(0f, 212f, 512f, 256f, paint)

        // Racing stripes
        paint.color = Color.parseColor(stripeHex)
        canvas.drawRect(0f, 146f, 512f, 180f, paint)
        paint.color = Color.parseColor(accentHex)
        canvas.drawRect(0f, 180f, 512f, 192f, paint)

        // Doors
        val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 3f
        }
        val doorXs = floatArrayOf(72f, 224f, 376f)
        for (dx in doorXs) {
            paint.color = Color.argb(62, 15, 23, 42)
            canvas.drawRect(dx, 42f, dx + 62f, 210f, paint)
            strokePaint.color = Color.argb(115, 255, 255, 255)
            canvas.drawRect(dx + 2f, 44f, dx + 60f, 208f, strokePaint)

            paint.color = Color.parseColor("#0F172A")
            canvas.drawRect(dx + 8f, 56f, dx + 28f, 124f, paint)
            canvas.drawRect(dx + 34f, 56f, dx + 54f, 124f, paint)

            paint.color = Color.argb(72, 186, 230, 253)
            canvas.drawRect(dx + 10f, 58f, dx + 16f, 112f, paint)
            canvas.drawRect(dx + 36f, 58f, dx + 42f, 112f, paint)
        }

        // Passenger windows
        val winXs = floatArrayOf(14f, 152f, 304f, 450f)
        for (wx in winXs) {
            val rect = RectF(wx, 54f, wx + 48f, 116f)
            paint.color = Color.parseColor("#0F172A")
            canvas.drawRoundRect(rect, 8f, 8f, paint)
            strokePaint.color = Color.parseColor("#94A3B8")
            canvas.drawRoundRect(rect, 8f, 8f, strokePaint)

            paint.color = Color.argb(62, 186, 230, 253)
            canvas.drawRect(wx + 7f, 60f, wx + 19f, 106f, paint)
        }

        // Graffiti tags
        paint.alpha = 220
        paint.color = Color.parseColor(graffitiAHex)
        canvas.save()
        canvas.rotate(-8f, 185f, 190f)
        canvas.drawOval(RectF(147f, 174f, 223f, 206f), paint)
        canvas.restore()

        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.DEFAULT_BOLD
            textSize = 24f
            color = Color.parseColor(graffitiBHex)
        }
        canvas.drawText("METRO", 146f, 198f, textPaint)

        paint.color = Color.parseColor(graffitiBHex)
        canvas.save()
        canvas.rotate(7f, 340f, 186f)
        canvas.drawOval(RectF(310f, 172f, 370f, 200f), paint)
        canvas.restore()

        textPaint.color = Color.WHITE
        textPaint.textSize = 20f
        canvas.drawText("DASH", 314f, 194f, textPaint)

        return bmp
    }

    private fun createContactShadowBitmap(): Bitmap {
        val bmp = Bitmap.createBitmap(128, 128, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                64f,
                64f,
                60f,
                intArrayOf(
                    Color.argb(145, 15, 23, 42),
                    Color.argb(64, 15, 23, 42),
                    Color.argb(0, 15, 23, 42),
                ),
                floatArrayOf(0f, 0.6f, 1f),
                Shader.TileMode.CLAMP,
            )
        }
        canvas.drawCircle(64f, 64f, 60f, paint)
        return bmp
    }

    private fun createSparkSpriteBitmap(): Bitmap {
        val bmp = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                32f,
                32f,
                30f,
                intArrayOf(
                    Color.argb(255, 255, 255, 255),
                    Color.argb(220, 255, 230, 120),
                    Color.argb(0, 255, 140, 0),
                ),
                floatArrayOf(0f, 0.45f, 1f),
                Shader.TileMode.CLAMP,
            )
        }
        canvas.drawCircle(32f, 32f, 30f, paint)
        return bmp
    }
}
