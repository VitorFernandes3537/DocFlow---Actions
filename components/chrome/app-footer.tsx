export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="df-footer">
      <div className="df-footer-inner">
        <strong>Vitor.Dev</strong>
        <span>© {year} DocFlow Actions. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}
