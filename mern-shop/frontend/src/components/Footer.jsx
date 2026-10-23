export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>&copy; {new Date().getFullYear()} MERN Shop. Built with MongoDB, Express, React & Node.</p>
      </div>
    </footer>
  );
}
