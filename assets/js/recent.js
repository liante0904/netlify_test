document.addEventListener('DOMContentLoaded', () => {
    const reportContainer = document.getElementById('report-container');
    const loadingElement = document.getElementById('loading');
    const bottomNav = document.querySelector('.bottom-nav');
    let offset = 0;
    let hasMore = true;
    let isFetching = false;
    let lastScrollY = window.scrollY;

    const apiUrl = () =>
        `https://g76c46bf8e6ef65-oracledb.adb.ap-seoul-1.oraclecloudapps.com/ords/admin/data_main_daily_send/search/?offset=${offset}`;

    async function fetchData() {
        if (!hasMore || isFetching) return;
        isFetching = true;
        loadingElement.style.display = 'block';

        try {
            const response = await fetch(apiUrl());
            const { items, hasMore: apiHasMore } = await response.json();

            // 데이터 그룹화
            const groupedData = items.reduce((acc, item) => {
                // save_time에서 날짜 추출 (T 제외)
                const date = item.save_time.split('T')[0];
                if (!acc[date]) acc[date] = {};
                if (!acc[date][item.firm_nm]) acc[date][item.firm_nm] = [];
            
                acc[date][item.firm_nm].push({
                    id: item.report_id,
                    title: item.article_title,
                    writer: item.writer,
                    link: item.telegram_url || item.download_url || item.attach_url // 우선순위 변경
                });
                return acc;
            }, {});
            
            renderReports(groupedData);
            hasMore = apiHasMore;
            offset += items.length;
            
            } catch (error) {
                console.error('Error:', error);
            } finally {
                isFetching = false;
                loadingElement.style.display = 'none';
            }            
    }

    function renderReports(data) {
        Object.entries(data).sort(([a], [b]) => new Date(b) - new Date(a)).forEach(([date, firms]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';
            dateGroup.innerHTML = `<div class="date-title">${date}</div>`;

            Object.entries(firms).forEach(([firm, reports]) => {
                const companyGroup = document.createElement('div');
                companyGroup.className = 'company-group';
                companyGroup.innerHTML = `<div class="company-title">${firm}</div>`;

                reports.forEach(report => {
                    const reportElement = document.createElement('div');
                    reportElement.className = 'report';
                    reportElement.innerHTML = `
                        <a href="${report.link}" target="_blank">${report.title}</a>
                        <p>작성자: ${report.writer}</p>
                    `;
                    companyGroup.appendChild(reportElement);
                });

                dateGroup.appendChild(companyGroup);
            });

            reportContainer.appendChild(dateGroup);
        });
    }

    // 무한 스크롤 및 bottomNav 처리
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const isDesktop = window.innerWidth >= 1024; // 데스크탑 기준 너비

        // 무한 스크롤 처리
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            fetchData();
        }

        // bottomNav 처리
        if (isDesktop) {
            bottomNav.style.display = 'none';
        } else {
            if (currentScrollY > lastScrollY) {
                // 스크롤 내릴 때 숨김
                bottomNav.style.transform = 'translateY(100%)';
                bottomNav.style.display = 'none';
            } else {
                // 스크롤 올릴 때 표시
                bottomNav.style.transform = 'translateY(0)';
                bottomNav.style.display = 'flex';
            }
        }

        lastScrollY = currentScrollY;
    });

    // 초기 데이터 로드
    fetchData();
});
