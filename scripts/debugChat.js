/**
 * Debug script to test chat functionality
 * Run with: node scripts/debugChat.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔍 CHAT DEBUG CHECKLIST\n');
console.log('Please check the following in your app:\n');

console.log('1. ✅ Check AsyncStorage for coach assignments:');
console.log('   - Open React Native Debugger or Flipper');
console.log('   - Look for key: @coach_assignments');
console.log('   - It should contain: { "<user_id>": "<coach_id>" }\n');

console.log('2. ✅ Check console logs when navigating to chat:');
console.log('   - Look for: [useCoaches] 🔍 Fetching coach for user');
console.log('   - Look for: [useCoaches] ✅ Found coach');
console.log('   - Look for: [ChatScreen] 🔍 Chat Partner Debug');
console.log('   - Look for: [useMessages] fetchMessages called\n');

console.log('3. ✅ Check that myCoach is populated:');
console.log('   - myCoachExists should be: true');
console.log('   - myCoachUserId should not be: undefined');
console.log('   - chatPartnerId should not be: undefined\n');

console.log('4. ✅ Check useMessages hook:');
console.log('   - Loading should eventually become: false');
console.log('   - Messages array should load (empty array is OK)\n');

console.log('5. ✅ If myCoach is null after assignment:');
console.log('   - Clear AsyncStorage: @coach_assignments');
console.log('   - Restart the app');
console.log('   - Assign coach again\n');

console.log('6. ✅ Supabase Database check:');
console.log('   - Open Supabase dashboard');
console.log('   - Go to Table Editor -> coaches');
console.log('   - Verify 6 coaches exist');
console.log('   - Go to Table Editor -> coach_client_assignments');
console.log('   - Check if your assignment exists with is_active = true\n');

console.log('═'.repeat(60));
console.log('\n💡 Quick Fix Steps:\n');

console.log('STEP 1: Clear and reassign');
console.log('  - In your app, add this code somewhere temporary:');
console.log('    import AsyncStorage from "@react-native-async-storage/async-storage";');
console.log('    await AsyncStorage.removeItem("@coach_assignments");');
console.log('    console.log("Cleared coach assignments");\n');

console.log('STEP 2: After clearing, assign coach again\n');

console.log('STEP 3: Check the logs for the debug output\n');

console.log('═'.repeat(60));

rl.question('\nPress Enter to see the test code to add to your app...', () => {
  console.log('\n📝 Add this to ChatScreen (temporarily for debugging):\n');
  console.log(`
useEffect(() => {
  const debugCoachData = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem('@coach_assignments');
    console.log('🐛 STORED COACH ASSIGNMENTS:', stored);
    console.log('🐛 USER ID:', user?.id);
    console.log('🐛 MY COACH:', myCoach);
    console.log('🐛 CHAT PARTNER ID:', chatPartnerId);
  };
  debugCoachData();
}, [myCoach, chatPartnerId]);
  `);
  
  rl.close();
});
