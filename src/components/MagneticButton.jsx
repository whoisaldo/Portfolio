// src/components/MagneticButton.jsx
import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function MagneticButton({ children, href, download, className = "", ...props }) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      download={download}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative px-6 py-3 rounded-full bg-gradient-to-r from-accent-purple to-accent-fuchsia 
                 text-white font-semibold shadow-glow hover:shadow-glow-lg 
                 transition-shadow duration-300 cursor-pointer ${className}`}
      {...props}
    >
      <span style={{ transform: "translateZ(25px)" }} className="relative z-10">
        {children}
      </span>
      
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-purple to-accent-fuchsia blur-xl"
        animate={{ opacity: isHovered ? 0.4 : 0, scale: isHovered ? 1.2 : 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.a>
  );
}
