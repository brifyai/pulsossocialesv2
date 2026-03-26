/**
 * Test Script: Opinion State Persistence
 * CADEM Opinion Engine v1.1
 *
 * Verifica que los estados de opinión y panel se persisten correctamente
 * en la base de datos Supabase.
 *
 * Uso: npx tsx scripts/test/testOpinionStatePersistence.ts
 */

import { opinionStateRepository } from '../../src/services/supabase/repositories/opinionStateRepository';
import { resolveAgentState } from '../../src/app/opinionEngine/opinionStateLoader';
import type { TopicState } from '../../src/app/opinionEngine/types';
import type { PanelState } from '../../src/app/panel/types';

// Test agent
const testAgent = {
  agentId: 'TEST-AGENT-001',
  age: 35,
  sex: 'female' as const,
  educationLevel: 'university' as const,
  incomeDecile: 6,
  regionCode: 'CL-13',
  comunaCode: '13101',
  urbanicity: 'urban' as const,
  connectivityLevel: 'high' as const,
  digitalExposureLevel: 'high' as const,
  socioeconomicLevel: 'middle_class' as const,
  occupationStatus: 'employed' as const,
};

// Test topic states
const testTopicStates: TopicState[] = [
  {
    topic: 'economy_national',
    score: 0.65,
    confidence: 0.8,
    salience: 0.7,
    volatility: 0.15,
    updatedAt: new Date(),
  },
  {
    topic: 'government_approval',
    score: 0.45,
    confidence: 0.75,
    salience: 0.6,
    volatility: 0.2,
    updatedAt: new Date(),
  },
  {
    topic: 'security_perception',
    score: 0.55,
    confidence: 0.7,
    salience: 0.5,
    volatility: 0.18,
    updatedAt: new Date(),
  },
];

// Test panel state
const testPanelState: PanelState = {
  agentId: testAgent.agentId,
  eligibleWeb: true,
  participationPropensity: 0.75,
  panelFatigue: 0.2,
  qualityScore: 0.85,
  cooldownUntil: null,
  invites30d: 5,
  completions30d: 4,
  lastInvitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  lastCompletedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
  updatedAt: new Date(),
};

async function runTests() {
  console.log('🧪 Testing Opinion State Persistence\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Save topic states
    console.log('\n📥 Test 1: Save Topic States');
    await opinionStateRepository.saveTopicStates(testAgent.agentId, testTopicStates);
    console.log('✅ Topic states saved successfully');

    // Test 2: Load topic states
    console.log('\n📤 Test 2: Load Topic States');
    const loadedTopicStates = await opinionStateRepository.getTopicStates(testAgent.agentId);
    console.log(`✅ Loaded ${loadedTopicStates.length} topic states`);

    if (loadedTopicStates.length !== testTopicStates.length) {
      throw new Error(`Expected ${testTopicStates.length} states, got ${loadedTopicStates.length}`);
    }

    // Verify data integrity
    for (const original of testTopicStates) {
      const loaded = loadedTopicStates.find(s => s.topic === original.topic);
      if (!loaded) {
        throw new Error(`Topic ${original.topic} not found in loaded states`);
      }
      if (Math.abs(loaded.score - original.score) > 0.001) {
        throw new Error(`Score mismatch for ${original.topic}: ${loaded.score} vs ${original.score}`);
      }
      console.log(`  ✓ ${original.topic}: score=${loaded.score.toFixed(2)}`);
    }

    // Test 3: Save panel state
    console.log('\n📥 Test 3: Save Panel State');
    await opinionStateRepository.savePanelState(testPanelState);
    console.log('✅ Panel state saved successfully');

    // Test 4: Load panel state
    console.log('\n📤 Test 4: Load Panel State');
    const loadedPanelState = await opinionStateRepository.getPanelState(testAgent.agentId);

    if (!loadedPanelState) {
      throw new Error('Panel state not found');
    }

    console.log('✅ Panel state loaded successfully');
    console.log(`  - Eligible Web: ${loadedPanelState.eligibleWeb}`);
    console.log(`  - Participation Propensity: ${loadedPanelState.participationPropensity.toFixed(2)}`);
    console.log(`  - Panel Fatigue: ${loadedPanelState.panelFatigue.toFixed(2)}`);
    console.log(`  - Quality Score: ${loadedPanelState.qualityScore.toFixed(2)}`);
    console.log(`  - Invites 30d: ${loadedPanelState.invites30d}`);
    console.log(`  - Completions 30d: ${loadedPanelState.completions30d}`);

    // Test 5: Resolve agent state (loader integration)
    console.log('\n🔍 Test 5: Resolve Agent State (Loader Integration)');
    const { topicStates: resolvedTopics, panelState: resolvedPanel } = await resolveAgentState(testAgent);
    console.log(`✅ Resolved ${resolvedTopics.length} topic states from loader`);
    console.log(`✅ Resolved panel state from loader: ${resolvedPanel ? 'YES' : 'NO'}`);

    // Test 6: Update existing states
    console.log('\n📝 Test 6: Update Existing States');
    const updatedTopicStates = testTopicStates.map(s => ({
      ...s,
      score: s.score + 0.1,
      updatedAt: new Date(),
    }));
    await opinionStateRepository.saveTopicStates(testAgent.agentId, updatedTopicStates);

    const reloadedTopics = await opinionStateRepository.getTopicStates(testAgent.agentId);
    const economyState = reloadedTopics.find(s => s.topic === 'economy_national');
    if (economyState && Math.abs(economyState.score - 0.75) > 0.001) {
      throw new Error(`Update failed: expected score ~0.75, got ${economyState.score}`);
    }
    console.log('✅ States updated successfully');

    // Test 7: Get stats
    console.log('\n📊 Test 7: Get Repository Stats');
    const stats = await opinionStateRepository.getStats();
    console.log(`✅ Repository stats:`);
    console.log(`  - Total topic states: ${stats.totalTopicStates}`);
    console.log(`  - Total panel states: ${stats.totalPanelStates}`);
    console.log(`  - Unique agents: ${stats.uniqueAgents}`);

    // Test 8: Cleanup
    console.log('\n🧹 Test 8: Cleanup Test Data');
    await opinionStateRepository.deleteAgentStates(testAgent.agentId);
    const afterCleanup = await opinionStateRepository.getTopicStates(testAgent.agentId);
    if (afterCleanup.length !== 0) {
      throw new Error(`Cleanup failed: ${afterCleanup.length} states remain`);
    }
    console.log('✅ Test data cleaned up successfully');

    // Final success
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
