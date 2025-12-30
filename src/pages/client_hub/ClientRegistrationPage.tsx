import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function ClientRegistration() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // 2. Create profile in Supabase
      const { data, error } = await supabase
        .from('client_profiles')
        .insert([
          {
            firebase_uid: user.uid,
            email: user.email,
            full_name: formData.fullName,
            phone: formData.phone
          }
        ])
        .select();

      if (error) {
        // If Supabase fails, delete the Firebase user to keep things clean
        await user.delete();
        throw error;
      }

      console.log('Registration successful!', data);
      navigate('/client-dashboard');

    } catch (error:any) {
      console.error('Registration error:', error.message);
      alert(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-light text-white">
            Create Client Account
          </h2>
          <p className="mt-2 text-center text-sm text-white/60">
            Join our fidelity program
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="relative block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-sm placeholder-white/40 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-sm placeholder-white/40 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="relative block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-sm placeholder-white/40 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                placeholder="Phone (Optional)"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="relative block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-sm placeholder-white/40 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                placeholder="Password (min. 6 characters)"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-white text-white rounded-sm hover:bg-white hover:text-gray-900 transition-all duration-300 font-light tracking-wide text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
          
          <div className="text-center">
            <Link
              to="/client-login"
              className="text-white/60 hover:text-white transition-colors duration-300 font-light text-sm"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}