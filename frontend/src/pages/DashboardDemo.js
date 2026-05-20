import "../styles/theme.css";
import ParticlesBG from "../components/ParticlesBG";
import { motion } from "framer-motion";

function Dashboard(){
  return(
    <>
      <ParticlesBG />

      <div style={{display:"flex", minHeight:"100vh"}}>

        {/* Sidebar */}
        <div style={{
          width:"260px",
          background:"rgba(5,5,20,0.7)",
          backdropFilter:"blur(10px)",
          borderRight:"1px solid rgba(255,255,255,0.1)",
          padding:"30px"
        }}>
          <h2 className="neonText">Creator Panel</h2>

          <div style={{marginTop:"40px"}}>
            <p className="menuItem">🏠 Dashboard</p>
            <p className="menuItem">🎬 My Shorts</p>
            <p className="menuItem">📊 Analytics</p>
            <p className="menuItem">⚙ Settings</p>
          </div>
        </div>


        {/* Main Area */}
        <div style={{
          padding:"50px",
          width:"100%",
          color:"white"
        }}>

          <motion.h1
            initial={{opacity:0,y:30}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.8}}
            className="neonText"
          >
            Import Your Latest Video
          </motion.h1>

          {/* Upload Box */}
          <motion.div
            whileHover={{scale:1.02}}
            className="glass uploadBox"
          >
            <p>📂 Drag & Drop Video</p>
            <button className="btnPrimary">Upload Video</button>
          </motion.div>


          {/* Tools Section */}
          <h2 style={{marginTop:"50px"}}>AI Creator Tools</h2>

          <div className="toolGrid">

            <motion.div whileHover={{y:-10}} className="glass toolCard">
              <h3>🎯 Auto Highlights</h3>
              <p>AI finds best engaging moments</p>
            </motion.div>

            <motion.div whileHover={{y:-10}} className="glass toolCard">
              <h3>⚡ Social Shorts</h3>
              <p>Generate viral reel clips instantly</p>
            </motion.div>

            <motion.div whileHover={{y:-10}} className="glass toolCard">
              <h3>✨ Smart Templates</h3>
              <p>Auto captions + editing styles</p>
            </motion.div>

          </div>

        </div>
      </div>
    </>
  )
}

export default Dashboard;