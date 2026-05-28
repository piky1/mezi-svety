export default function OnlineDot({ online }) {
  return (
    <span style={{
      position: 'absolute',
      bottom: 1, right: 1,
      width: 10, height: 10,
      borderRadius: '50%',
      background: online ? '#4caf50' : '#555',
      border: '2px solid var(--bg2)',
      boxShadow: online ? '0 0 6px #4caf50' : 'none',
      transition: 'background 0.3s',
    }} title={online ? 'Online' : 'Offline'} />
  )
}
