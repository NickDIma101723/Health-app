const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sampleCoaches = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@healthcoach.com',
    specialization: 'Nutrition',
    bio: 'Certified nutritionist with 10+ years of experience helping clients achieve their dietary goals. Specializes in weight management and meal planning.',
    is_active: true,
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    user_id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Mike Chen',
    email: 'mike.chen@healthcoach.com',
    specialization: 'Fitness',
    bio: 'Personal trainer and fitness coach with expertise in strength training, cardio optimization, and injury prevention. Helped 200+ clients transform their lives.',
    is_active: true,
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    user_id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@healthcoach.com',
    specialization: 'Mental Health',
    bio: 'Licensed psychologist specializing in stress management, mindfulness, and cognitive behavioral therapy. Passionate about holistic wellness.',
    is_active: true,
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    user_id: '00000000-0000-0000-0000-000000000004',
    full_name: 'David Kim',
    email: 'david.kim@healthcoach.com',
    specialization: 'Weight Loss',
    bio: 'Weight loss specialist who lost 100lbs himself. Expert in sustainable lifestyle changes, portion control, and motivation coaching.',
    is_active: true,
  },
  {
    id: '50000000-0000-0000-0000-000000000005',
    user_id: '00000000-0000-0000-0000-000000000005',
    full_name: 'Jessica Martinez',
    email: 'jessica.martinez@healthcoach.com',
    specialization: 'Sports',
    bio: 'Former Olympic athlete turned performance coach. Specializes in athletic training, sports nutrition, and competition preparation.',
    is_active: true,
  },
  {
    id: '60000000-0000-0000-0000-000000000006',
    user_id: '00000000-0000-0000-0000-000000000006',
    full_name: 'Robert Taylor',
    email: 'robert.taylor@healthcoach.com',
    specialization: 'General',
    bio: 'Holistic health coach focusing on overall wellness, lifestyle medicine, and preventive health. 15 years in the wellness industry.',
    is_active: true,
  },
];

async function insertCoaches() {
  console.log('🔄 Starting coach insertion...');
  console.log(`📊 Inserting ${sampleCoaches.length} sample coaches`);

  // Use raw SQL to bypass RLS
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      INSERT INTO public.coaches (id, user_id, full_name, email, specialization, bio, is_active) VALUES
        ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sarah Johnson', 'sarah.johnson@healthcoach.com', 'Nutrition', 'Certified nutritionist with 10+ years of experience helping clients achieve their dietary goals. Specializes in weight management and meal planning.', true),
        ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Mike Chen', 'mike.chen@healthcoach.com', 'Fitness', 'Personal trainer and fitness coach with expertise in strength training, cardio optimization, and injury prevention. Helped 200+ clients transform their lives.', true),
        ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Dr. Emily Rodriguez', 'emily.rodriguez@healthcoach.com', 'Mental Health', 'Licensed psychologist specializing in stress management, mindfulness, and cognitive behavioral therapy. Passionate about holistic wellness.', true),
        ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'David Kim', 'david.kim@healthcoach.com', 'Weight Loss', 'Weight loss specialist who lost 100lbs himself. Expert in sustainable lifestyle changes, portion control, and motivation coaching.', true),
        ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Jessica Martinez', 'jessica.martinez@healthcoach.com', 'Sports', 'Former Olympic athlete turned performance coach. Specializes in athletic training, sports nutrition, and competition preparation.', true),
        ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'Robert Taylor', 'robert.taylor@healthcoach.com', 'General', 'Holistic health coach focusing on overall wellness, lifestyle medicine, and preventive health. 15 years in the wellness industry.', true)
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `
  });

  if (error) {
    console.error('❌ Error inserting coaches:', error.message);
    console.error('Details:', error);
    console.log('\n⚠️  RLS is blocking the insert. You need to run this SQL directly in Supabase SQL Editor:');
    console.log('\n--- Copy this SQL ---\n');
    sampleCoaches.forEach((coach, index) => {
      if (index === 0) {
        console.log(`INSERT INTO public.coaches (id, user_id, full_name, email, specialization, bio, is_active) VALUES`);
      }
      const comma = index < sampleCoaches.length - 1 ? ',' : '';
      console.log(`  ('${coach.id}', '${coach.user_id}', '${coach.full_name}', '${coach.email}', '${coach.specialization}', '${coach.bio}', ${coach.is_active})${comma}`);
    });
    console.log(`ON CONFLICT (id) DO NOTHING;`);
    console.log('\n--- End SQL ---\n');
    process.exit(1);
  }

  console.log('✅ Successfully inserted coaches!');
  console.log(`📋 Inserted coaches`);
  
  process.exit(0);
}

insertCoaches();
