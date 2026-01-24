import 'dotenv/config';
import { supabase } from './supabase';
import app from "./app";

console.log('Supabase URL:', process.env.SUPABASE_URL);

// For Vercel serverless deployment - export the app
export default app;

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;

  (async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  console.log('Supabase test data:', data);
  console.log('Supabase test error:', error);
})();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
