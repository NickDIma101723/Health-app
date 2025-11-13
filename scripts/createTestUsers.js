const { createClient } = require('@supabase/supabase-js');

// Test script to create a sample user profile for testing
// Make sure to set your Supabase credentials

const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  console.log('🔧 Creating test user for client management testing...\n');

  try {
    const testUsers = [
      {
        email: 'testclient1@example.com',
        password: 'testpass123',
        name: 'John Doe',
        bio: 'I want to get in shape and improve my overall health',
        fitness_level: 'beginner',
        goals: 'Lose weight, build muscle, improve cardiovascular health'
      },
      {
        email: 'testclient2@example.com',
        password: 'testpass123',
        name: 'Jane Smith',
        bio: 'Looking to maintain a healthy lifestyle and stay active',
        fitness_level: 'intermediate',
        goals: 'Maintain current fitness, improve flexibility, stress management'
      },
      {
        email: 'testclient3@example.com',
        password: 'testpass123',
        name: 'Mike Johnson',
        bio: 'Recovering from injury and want to get back to sports',
        fitness_level: 'advanced',
        goals: 'Recovery, return to competitive sports, prevent future injuries'
      }
    ];

    for (const testUser of testUsers) {
      console.log(`Creating user: ${testUser.name} (${testUser.email})`);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            name: testUser.name,
            full_name: testUser.name,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User ${testUser.email} already exists, skipping...`);
          continue;
        }
        console.error(`   ❌ Auth error for ${testUser.email}:`, authError.message);
        continue;
      }

      if (!authData.user) {
        console.error(`   ❌ No user data returned for ${testUser.email}`);
        continue;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: authData.user.id,
          full_name: testUser.name,
          bio: testUser.bio,
          fitness_level: testUser.fitness_level,
          goals: testUser.goals,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (profileError) {
        console.error(`   ❌ Profile error for ${testUser.email}:`, profileError.message);
        continue;
      }

      console.log(`   ✅ Successfully created ${testUser.name}`);
    }

    console.log('\n✅ Test user creation complete!');
    console.log('Now try going to the Manage Clients screen in your app.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function listExistingUsers() {
  console.log('📋 Current users in database:\n');

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found in database.');
      return;
    }

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.full_name || 'No Name'}`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   Fitness Level: ${profile.fitness_level || 'Not set'}`);
      console.log(`   Goals: ${profile.goals || 'None set'}`);
      console.log(`   Created: ${new Date(profile.created_at).toLocaleDateString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
}

// Show usage instructions
console.log('🧪 Test User Creation Script');
console.log('============================');
console.log('');
console.log('IMPORTANT: Before running this script:');
console.log('1. Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your actual values');
console.log('2. Make sure your Supabase project allows user registration');
console.log('3. Check that RLS policies allow profile creation');
console.log('');
console.log('To use this script:');
console.log('- createTestUser() - Creates 3 test users');
console.log('- listExistingUsers() - Shows current users in database');
console.log('');

// Uncomment the line below to create test users
// createTestUser();

// Uncomment the line below to list existing users
// listExistingUsers();

module.exports = { createTestUser, listExistingUsers };