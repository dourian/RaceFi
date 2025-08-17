/**
 * Test script to validate ETH prize pool calculations
 * Run with: npx ts-node scripts/validatePools.ts
 */

import { challenges } from '../mock/mockChallenges';
import { analyzeAllPools, formatValidationReport } from '../utils/poolValidation';

function main() {
  console.log('🔍 Validating ETH Prize Pool Calculations...\n');
  
  // Analyze all challenges
  const analysis = analyzeAllPools(challenges);
  
  // Generate and display report
  const report = formatValidationReport(analysis);
  console.log(report);
  
  // Additional detailed analysis
  console.log('\n📊 DETAILED CHALLENGE BREAKDOWN:\n');
  
  analysis.results.forEach((result, index) => {
    const status = result.isValid ? '✅ VALID' : '❌ INVALID';
    const formula = `${result.stake} ETH × ${result.participants} participants`;
    const calculation = `${result.expectedPrizePool} ETH expected vs ${result.currentPrizePool} ETH actual`;
    
    console.log(`${index + 1}. ${result.challengeName}`);
    console.log(`   ${status}: ${formula} = ${calculation}`);
    
    if (!result.isValid) {
      console.log(`   🔴 Discrepancy: ${result.discrepancy > 0 ? '+' : ''}${result.discrepancy} ETH`);
    }
    
    // Show participant capacity
    const capacityUsed = ((result.participants / result.maxParticipants) * 100).toFixed(1);
    console.log(`   👥 Capacity: ${result.participants}/${result.maxParticipants} (${capacityUsed}% full)`);
    
    if (result.validationNotes.length > 0) {
      result.validationNotes.forEach(note => {
        console.log(`   ⚠️  ${note}`);
      });
    }
    
    console.log('');
  });
  
  // Summary statistics
  console.log('📈 STATISTICS:');
  console.log(`   • Total challenges analyzed: ${analysis.totalChallenges}`);
  console.log(`   • Challenges with correct calculations: ${analysis.validChallenges}`);
  console.log(`   • Challenges with incorrect calculations: ${analysis.invalidChallenges}`);
  console.log(`   • Total ETH staked by all participants: ${analysis.totalStakeAmount}`);
  console.log(`   • Total ETH in all prize pools: ${analysis.totalPrizePoolAmount}`);
  console.log(`   • System discrepancy: ${analysis.totalPrizePoolAmount - analysis.totalStakeAmount} ETH`);
  console.log(`   • Average stake per challenge: ${analysis.averageStake.toFixed(2)} ETH`);
  console.log(`   • Average participants per challenge: ${analysis.averageParticipants.toFixed(1)}`);
  
  // Return exit code based on validation
  if (analysis.invalidChallenges > 0) {
    console.log('\n❌ Validation failed: Some prize pools have incorrect calculations');
    process.exit(1);
  } else {
    console.log('\n✅ Validation passed: All prize pools are correctly calculated');
    process.exit(0);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

export { main as validatePools };
