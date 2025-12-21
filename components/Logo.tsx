
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 64, className = "" }) => {
  return (
    <div style={{ width: size, height: size }} className={`relative inline-block ${className}`}>
      <style>
        {`
          @keyframes orbit-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes orbit-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes pulse-star {
            0%, 100% { opacity: 0.6; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.1); }
          }
          .animate-orbit-1 { animation: orbit-slow 20s linear infinite; transform-origin: 50px 50px; }
          .animate-orbit-2 { animation: orbit-reverse 35s linear infinite; transform-origin: 50px 50px; }
          .animate-orbit-3 { animation: orbit-slow 28s linear infinite; transform-origin: 50px 50px; }
          .star-glow { animation: pulse-star 3s ease-in-out infinite; }
        `}
      </style>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sphere Base */}
        <circle cx="50" cy="50" r="48" fill="url(#sphereGradient)" />
        
        {/* Glow/Reflections */}
        <circle cx="50" cy="50" r="48" fill="url(#innerGlow)" fillOpacity="0.4" />
        
        {/* Animated Orbit Groups */}
        <g className="animate-orbit-1">
          <ellipse cx="50" cy="50" rx="42" ry="18" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.5" transform="rotate(-15 50 50)" />
          <circle cx="32" cy="24" r="2.5" fill="#F4F4DC" className="star-glow" style={{ animationDelay: '0.2s' }} />
          <circle cx="72" cy="51" r="5.5" fill="#F4F4DC" className="star-glow" style={{ animationDelay: '1.5s' }} />
        </g>

        <g className="animate-orbit-2">
          <ellipse cx="50" cy="50" rx="40" ry="25" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" transform="rotate(10 50 50)" />
          <circle cx="68" cy="24" r="2" fill="#F4F4DC" fillOpacity="0.8" className="star-glow" style={{ animationDelay: '0.8s' }} />
          <circle cx="23" cy="39" r="1.5" fill="#F4F4DC" />
          <circle cx="53" cy="58" r="2" fill="#F4F4DC" className="star-glow" style={{ animationDelay: '2.1s' }} />
        </g>

        <g className="animate-orbit-3">
          <ellipse cx="50" cy="50" rx="38" ry="32" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.5" transform="rotate(45 50 50)" />
          <circle cx="55" cy="33" r="3" fill="#F4F4DC" className="star-glow" style={{ animationDelay: '0s' }} />
          <circle cx="44" cy="42" r="1" fill="#F4F4DC" />
          <circle cx="30" cy="47" r="3.5" fill="#F4F4DC" className="star-glow" style={{ animationDelay: '1.2s' }} />
          <circle cx="18" cy="55" r="3" fill="#F4F4DC" />
          <circle cx="63" cy="65" r="1.5" fill="#F4F4DC" />
          <circle cx="48" cy="74" r="1.5" fill="#F4F4DC" />
        </g>

        {/* Highlight Curve at bottom */}
        <path d="M15 75C25 88 75 88 85 75" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" fill="none" />

        <defs>
          <radialGradient id="sphereGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(48)">
            <stop stopColor="#2D3E50" />
            <stop offset="1" stopColor="#1E2A3A" />
          </radialGradient>
          <radialGradient id="innerGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 20) rotate(90) scale(60)">
            <stop stopColor="#A3BCCB" />
            <stop offset="1" stopColor="#1E2A3A" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Logo;
