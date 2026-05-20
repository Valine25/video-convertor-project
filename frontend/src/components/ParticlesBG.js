import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

function ParticlesBG() {

  const particlesInit = async (engine) => {
    await loadFull(engine);
  };

  return (
    <Particles
      init={particlesInit}
      options={{
        fullScreen: { enable: true, zIndex: -1 },
        background: { color: "#050816" },

        particles: {
          number: { value: 80 },
          color: { value: ["#ff4d6d", "#7b61ff", "#00d4ff"] },

          move: {
            enable: true,
            speed: 1.5
          },

          links: {
            enable: true,
            color: "#7b61ff",
            opacity: 0.3
          },

          opacity: { value: 0.5 },
          size: { value: { min: 1, max: 3 } }
        }
      }}
    />
  );
}

export default ParticlesBG;