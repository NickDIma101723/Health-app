// Script to check users and profiles in the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

async function checkUsers() {
  console.log('🔍 Checking users and profiles in the database...\n');

  try {
    // Check profiles table
    console.log('📋 Profiles in database:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log(`Found ${profiles?.length || 0} profiles:`);
      profiles?.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.full_name || 'No Name'} (ID: ${profile.user_id})`);
        console.log(`   Created: ${new Date(profile.created_at).toLocaleDateString()}`);
        console.log(`   Fitness Level: ${profile.fitness_level || 'Not set'}`);
        console.log('');
      });
    }

    // Check coaches table
    console.log('\n🏃‍♀️ Coaches in database:');
    const { data: coaches, error: coachesError } = await supabase
      .from('coaches')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (coachesError) {
      console.error('❌ Error fetching coaches:', coachesError);
    } else {
      console.log(`Found ${coaches?.length || 0} active coaches:`);
      coaches?.forEach((coach, index) => {
        console.log(`${index + 1}. ${coach.full_name} (${coach.specialization})`);
        console.log(`   Email: ${coach.email}`);
        console.log(`   User ID: ${coach.user_id}`);
        console.log('');
      });
    }

    // Check assignments
    console.log('\n🤝 Coach-Client Assignments:');
    const { data: assignments, error: assignmentsError } = await supabase
      .from('coach_client_assignments')
      .select('*, coaches(full_name), profiles!coach_client_assignments_client_user_id_fkey(full_name)')
      .eq('is_active', true);

    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError);
    } else {
      console.log(`Found ${assignments?.length || 0} active assignments:`);
      assignments?.forEach((assignment, index) => {
        console.log(`${index + 1}. Coach: ${assignment.coaches?.full_name || 'Unknown'}`);
        console.log(`   Client: ${assignment.profiles?.full_name || 'Unknown'}`);
        console.log(`   Assigned: ${new Date(assignment.assigned_at).toLocaleDateString()}`);
        console.log('');
      });
    }

    console.log('\n✅ Database check complete!');
    console.log('\n💡 If you don\'t see any profiles, try:');
    console.log('1. Register a new user through the app');
    console.log('2. Make sure email verification is complete');
    console.log('3. Check if there are any console errors during registration');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Export for use in other scripts
module.exports = { checkUsers };

// Run directly if this file is executed
if (require.main === module) {
  checkUsers().then(() => process.exit(0));
}