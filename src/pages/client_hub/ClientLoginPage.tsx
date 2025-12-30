import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { Link, useNavigate } from 'react-router-dom';

export default function ClientLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    setLoading(true);

    try {

      console.log('Attempting login for:', formData.email);
      await signInWithEmailAndPassword(auth, formData.email, formData.password);

      navigate('/client-dashboard');
    } catch (error:any) {
      console.error('Login error:', error.message);
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-light text-white">
            Client Login
          </h2>
          <p className="mt-2 text-center text-sm text-white/60">
            Access your fidelity account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full px-3 py-3 bg-white/5 border border-white/10 rounded-sm placeholder-white/40 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-light tracking-wide text-sm"
                placeholder="Password"
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
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="text-center">
            <Link
              to="/client-register"
              className="text-white/60 hover:text-white transition-colors duration-300 font-light text-sm"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}