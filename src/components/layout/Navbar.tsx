import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export const Navbar = () => {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl rounded-full glass-nav z-50 px-8 py-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">
        Axion
      </Link>
      
      <div className="hidden md:flex items-center gap-10 font-headline font-medium text-sm">
        <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Features</a>
        <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">How It Works</a>
        <a href="#" className="text-on-surface-variant hover:text-primary transition-colors">Pricing</a>
      </div>

      <div className="flex items-center gap-4">
        <Link to="/login">
          <Button variant="ghost" size="sm">Login</Button>
        </Link>
        <Link to="/signup">
          <Button variant="primary" size="sm">Get Started</Button>
        </Link>
      </div>
    </nav>
  );
};
