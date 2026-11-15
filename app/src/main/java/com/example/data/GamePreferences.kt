package com.example.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "metrodash_prefs")

class GamePreferences(private val context: Context) {

    private val bestScoreKey = intPreferencesKey("metrodash_best_score")
    private val totalCoinsKey = intPreferencesKey("metrodash_total_coins")

    val bestScore: Flow<Int> = context.dataStore.data.map { prefs ->
        prefs[bestScoreKey] ?: 0
    }

    val totalCoins: Flow<Int> = context.dataStore.data.map { prefs ->
        prefs[totalCoinsKey] ?: 0
    }

    suspend fun recordRunResult(runScore: Int, runCoins: Int): Boolean {
        var isNewBest = false
        context.dataStore.edit { prefs ->
            val currentCoins = prefs[totalCoinsKey] ?: 0
            prefs[totalCoinsKey] = currentCoins + runCoins

            val currentBest = prefs[bestScoreKey] ?: 0
            if (runScore > currentBest) {
                prefs[bestScoreKey] = runScore
                isNewBest = true
            }
        }
        return isNewBest
    }
}
