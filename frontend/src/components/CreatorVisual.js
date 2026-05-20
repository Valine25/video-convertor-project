import { motion } from "framer-motion";

function CreatorVisual({ walkIn, cameraLifted, reelActive }) {
  return (
    <motion.div
      className="creator-wrap"
      initial={{ x: -180, y: 30, opacity: 0 }}
      animate={walkIn ? { x: 0, y: 0, opacity: 1 } : { x: -180, y: 30, opacity: 0 }}
      transition={{ duration: 1.8, ease: [0.18, 0.9, 0.24, 1] }}
    >
      <div className="creator-scene">
        <div className="studio-floor" />
        <div className="stage-backlight" />

        <motion.div
          className="studio-rig"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="rig-base" />
          <div className="rig-column" />
          <motion.div
            className="rig-head"
            animate={cameraLifted ? { rotate: -8, y: -12 } : { rotate: 0, y: 0 }}
            transition={{ duration: 1.4, ease: [0.18, 0.9, 0.24, 1] }}
          >
            <div className="rig-lens-shell">
              <motion.div
                className="rig-lens-core"
                animate={
                  reelActive
                    ? { scale: [0.9, 1.08, 1], opacity: [0.4, 1, 0.55] }
                    : { scale: 0.9, opacity: 0.35 }
                }
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="rig-monitor" />
            <div className="rig-mic" />
          </motion.div>

          <motion.div
            className="floating-card card-a"
            animate={
              reelActive
                ? { x: [0, 18, 0], y: [0, -10, 0], rotate: [0, 4, 0] }
                : { x: 0, y: 0, rotate: 0 }
            }
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          >
            Hook
          </motion.div>
          <motion.div
            className="floating-card card-b"
            animate={
              reelActive
                ? { x: [0, -12, 0], y: [0, 10, 0], rotate: [0, -5, 0] }
                : { x: 0, y: 0, rotate: 0 }
            }
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            Transcript
          </motion.div>
          <motion.div
            className="floating-card card-c"
            animate={
              reelActive
                ? { x: [0, 10, 0], y: [0, -14, 0], rotate: [0, 3, 0] }
                : { x: 0, y: 0, rotate: 0 }
            }
            transition={{ duration: 5.1, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
          >
            Export
          </motion.div>
        </motion.div>

        <motion.div
          className="phone-stage"
          initial={{ opacity: 0, x: 40, scale: 0.92 }}
          animate={reelActive ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0.55, x: 18, scale: 0.96 }}
          transition={{ duration: 1.1, ease: [0.18, 0.9, 0.24, 1] }}
        >
          <div className="phone-shell">
            <div className="phone-notch" />
            <div className="phone-screen">
              <motion.div
                className="screen-wave"
                animate={{ backgroundPositionY: ["0%", "100%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <div className="screen-caption">AI Reel Preview</div>
              <div className="screen-card screen-card-top" />
              <div className="screen-card screen-card-middle" />
              <div className="screen-card screen-card-bottom" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default CreatorVisual;
