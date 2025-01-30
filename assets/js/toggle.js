// 메뉴 토글
function toggleMenu() {
    const menu = document.getElementById('floatingMenu');
    menu.classList.toggle('open');
}
// 메뉴 토글
function toggleMenu_top() {
    const menuPanel = document.querySelector('.menu-panel');
    menuPanel.classList.toggle('open');

}
// 검색창 토글
function toggleSearch() {
    const overlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');

    if (overlay.style.display === 'flex') {
        overlay.style.display = 'none';
    } else {
        overlay.style.display = 'flex';
        searchInput.focus();
    }
}