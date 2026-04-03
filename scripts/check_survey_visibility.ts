/**
 * Script para verificar visibilidad de encuestas con diferentes roles
 * Compara lo que ve el rol anónimo (frontend) vs service role
 */

import { createClient } from '@supabase/supabase-js';
import './utils/loadEnv.ts';

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

async function checkVisibility() {
  console.log('🔍 Checking survey visibility with different roles...\n');

  // Cliente con rol anónimo (como el frontend)
  const anonClient = createClient(supabaseUrl, anonKey);

  // Cliente con service role (admin)
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // 1. Verificar con service role (debería ver todas)
  console.log('=== SERVICE ROLE (Admin) ===');
  const { data: serviceData, error: serviceError } = await serviceClient
    .from('survey_definitions')
    .select('id, name, created_at, deleted_at, created_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (serviceError) {
    console.error('❌ Service role error:', serviceError.message);
  } else {
    console.log(`✅ Service role sees ${serviceData?.length || 0} surveys:`);
    serviceData?.forEach((s: any) => {
      console.log(`   - ${s.name} (ID: ${s.id})`);
    });
  }

  console.log('\n=== ANON ROLE (Frontend) ===');
  // 2. Verificar con rol anónimo (como el frontend)
  const { data: anonData, error: anonError } = await anonClient
    .from('survey_definitions')
    .select('id, name, created_at, deleted_at, created_by')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (anonError) {
    console.error('❌ Anon role error:', anonError.message);
    console.error('   Code:', anonError.code);
    console.error('   Details:', anonError.details);
  } else {
    console.log(`✅ Anon role sees ${anonData?.length || 0} surveys:`);
    anonData?.forEach((s: any) => {
      console.log(`   - ${s.name} (ID: ${s.id})`);
    });
  }

  // 3. Comparar
  console.log('\n=== COMPARISON ===');
  const serviceIds = new Set(serviceData?.map((s: any) => s.id) || []);
  const anonIds = new Set(anonData?.map((s: any) => s.id) || []);

  const missingFromAnon = serviceData?.filter((s: any) => !anonIds.has(s.id)) || [];
  const extraInAnon = anonData?.filter((s: any) => !serviceIds.has(s.id)) || [];

  if (missingFromAnon.length > 0) {
    console.log(`⚠️  ${missingFromAnon.length} surveys visible to SERVICE but NOT to ANON:`);
    missingFromAnon.forEach((s: any) => {
      console.log(`   - ${s.name} (ID: ${s.id})`);
      console.log(`     created_by: ${s.created_by || 'null'}`);
    });
    console.log('\n🔧 This is likely an RLS policy issue!');
    console.log('   The anon role may not have permission to see surveys created by other users.');
  } else {
    console.log('✅ All surveys visible to service role are also visible to anon role');
  }

  if (extraInAnon.length > 0) {
    console.log(`⚠️  ${extraInAnon.length} surveys visible to ANON but NOT to SERVICE (unexpected)`);
  }

  // 4. Verificar RLS policies
  console.log('\n=== RLS POLICIES ===');
  const { data: policies, error: policyError } = await serviceClient
    .rpc('get_policies_for_table', { table_name: 'survey_definitions' });

  if (policyError) {
    console.log('ℹ️  Could not fetch RLS policies (rpc may not exist)');
    console.log('   Manual check: Run this SQL in Supabase SQL Editor:');
    console.log(`   SELECT * FROM pg_policies WHERE tablename = 'survey_definitions';`);
  } else {
    console.log('RLS Policies for survey_definitions:');
    console.log(policies);
  }
}

checkVisibility().catch(console.error);
