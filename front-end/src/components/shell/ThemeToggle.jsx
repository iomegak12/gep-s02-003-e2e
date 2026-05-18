import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider.jsx';
import Tooltip from '../ui/Tooltip.jsx';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip label={`Switch to ${next} theme`} placement="bottom">
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${next} theme`}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </Tooltip>
  );
}
