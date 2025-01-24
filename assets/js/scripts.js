// 메뉴 토글
function toggleMenu() {
    const menuPanel = document.querySelector('.menu-panel');
    menuPanel.classList.toggle('open');
}

// 검색창 토글
function toggleSearch() {
    const overlay = document.getElementById("searchOverlay");
    const searchInput = document.getElementById("searchInput");

    if (overlay.style.display === "flex") {
        overlay.style.display = "none";
    } else {
        overlay.style.display = "flex";
        searchInput.focus(); // 검색창 열릴 때 자동 포커스
    }
}

// 검색 실행
function submitSearch() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        alert("검색어를 입력해주세요.");
        return;
    }
    // `/reports/search/{키워드}`로 리다이렉션
    window.location.href = `/reports/search/${encodeURIComponent(query)}`;
}

// 검색 입력 필드에서 Enter 키 처리
document.getElementById("searchInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        submitSearch();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const subtitleElement = document.getElementById('subtitle');
    const reportContainer = document.getElementById('report-container');
    const loadingElement = document.getElementById('loading');

    const currentPath = window.location.pathname;

    // `/reports/search/{키워드}` 페이지인지 확인
    if (currentPath.startsWith('/reports/search/')) {
        const keyword = decodeURIComponent(currentPath.split('/').pop()); // URL에서 키워드 추출
        subtitleElement.textContent = `검색 결과: "${keyword}"`;

        let offset = 0; // 처음 오프셋 값
        let limit = 30; // 요청당 데이터 개수
        let isFetching = false; // 중복 fetch 방지 플래그
        let hasMoreData = true; // 더 가져올 데이터가 있는지 여부

        // 검색 API URL 생성 함수
        const apiUrl = (offset, limit) =>
            `https://ssh-oci.duckdns.org/reports/search?keyword=${encodeURIComponent(keyword)}&offset=${offset}&limit=${limit}`;
        
        // 데이터 가져오기 및 렌더링
        const fetchAndRenderData = () => {
            if (isFetching || !hasMoreData) return; // 이미 fetch 중이거나 더 가져올 데이터가 없는 경우 중단
        
            isFetching = true; // fetch 중 상태로 설정
            fetch(apiUrl(offset, limit)) // API 호출
                .then(response => {
                    if (!response.ok) throw new Error('네트워크 응답에 문제가 있습니다.'); // 오류 처리
                    return response.json();
                })
                .then(data => {
                    if (data.length === 0) { // 더 이상 데이터가 없으면 종료
                        hasMoreData = false; 
                        if (offset === 0) { // 첫 요청인데 데이터가 없으면 "결과 없음" 표시
                            reportContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
                        } else {
                            showEndOfResultsMessage(); // 모든 데이터 로드 완료 메시지 표시
                        }
                        return;
                    }
        
                    renderSearchResults(data); // 가져온 데이터를 렌더링
                    offset += limit; // 다음 호출을 위해 offset 증가
                })
                .catch(error => {
                    console.error('API 호출 중 오류 발생:', error);
                    if (offset === 0) { // 첫 요청에서 오류 발생 시 메시지 표시
                        reportContainer.innerHTML = '<p>검색 결과를 가져오는 데 실패했습니다.</p>';
                    }
                })
                .finally(() => {
                    isFetching = false; // fetch 상태 초기화
                    loadingElement.style.display = 'none'; // 로딩 스피너 숨김
                });
        };

        // 검색 결과 렌더링 함수
        const renderSearchResults = (data) => {
            // 날짜별로 그룹화하여 정렬
            const sortedData = Object.entries(data).sort(([dateA], [dateB]) => {
                const dateAParsed = new Date(dateA); // 날짜 A 파싱
                const dateBParsed = new Date(dateB); // 날짜 B 파싱
                return dateBParsed - dateAParsed; // 최신 날짜가 위로 오도록 정렬
            });

            // 날짜 및 회사별로 결과 표시
            sortedData.forEach(([date, companies]) => {
                const dateGroup = document.createElement('div');
                dateGroup.className = 'date-group';

                const dateTitle = document.createElement('div');
                dateTitle.className = 'date-title';
                dateTitle.textContent = date;
                dateGroup.appendChild(dateTitle);

                Object.entries(companies).forEach(([company, reports]) => {
                    const companyGroup = document.createElement('div');
                    companyGroup.className = 'company-group';

                    const companyTitle = document.createElement('div');
                    companyTitle.className = 'company-title';
                    companyTitle.textContent = company;
                    companyGroup.appendChild(companyTitle);

                    reports.forEach(report => {
                        const reportElement = document.createElement('div');
                        reportElement.className = 'report';

                        const reportLink = document.createElement('a');
                        reportLink.href = report.link; // 보고서 링크 설정
                        reportLink.target = '_blank'; // 새 창에서 열기
                        reportLink.textContent = report.title; // 보고서 제목

                        const reportWriter = document.createElement('p');
                        reportWriter.textContent = `작성자: ${report.writer}`; // 작성자 표시

                        reportElement.appendChild(reportLink); // 링크 추가
                        reportElement.appendChild(reportWriter); // 작성자 추가
                        companyGroup.appendChild(reportElement); // 회사 그룹에 보고서 추가
                    });

                    dateGroup.appendChild(companyGroup); // 날짜 그룹에 회사 그룹 추가
                });

                reportContainer.appendChild(dateGroup); // 컨테이너에 날짜 그룹 추가
            });
        };

        // 데이터가 모두 로드되었을 때 메시지 표시
        const showEndOfResultsMessage = () => {
            const endMessage = document.createElement('div');
            endMessage.className = 'end-of-results';
            endMessage.textContent = '모든 데이터를 조회했습니다.';
            reportContainer.appendChild(endMessage);
        };

        // 무한 스크롤 이벤트
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY + window.innerHeight;
            const threshold = document.documentElement.scrollHeight * 0.6; // 로딩 임계값 (60%)

            if (scrollPosition > threshold) {
                fetchAndRenderData(); // 임계값에 도달하면 데이터 가져오기
            }
        });

        // 초기 데이터 로드
        fetchAndRenderData();
        return; // 검색 페이지 전용 로직 이후 일반 페이지 로직 실행 방지
    }

    // 기존 메뉴 페이지 처리
    const isDailyGroup = currentPath.includes('daily_group');
    const isDailyGlobal = currentPath.includes('daily_global');

    const jsonBaseUrl = isDailyGroup
        ? 'https://ssh-oci.duckdns.org/static/reports/daily_group_reports.json'
        : isDailyGlobal
            ? 'https://ssh-oci.duckdns.org/static/reports/daily_global_reports.json'
            : 'https://ssh-oci.duckdns.org/static/reports/recent_reports.json';

    const timestamp = new Date().getTime();
    const jsonUrl = `${jsonBaseUrl}?t=${timestamp}`;

    subtitleElement.textContent = isDailyGroup
        ? '현재 메뉴: 일자별 레포트 (그룹)'
        : isDailyGlobal
            ? '현재 메뉴: 일자별 레포트 (글로벌)'
            : '현재 메뉴: 최근 게시된 레포트';

    loadingElement.style.display = 'block';

    fetch(jsonUrl)
        .then(response => {
            if (!response.ok) throw new Error('네트워크 응답에 문제가 있습니다.');
            return response.json();
        })
        .then(data => {
            renderReports(data);
        })
        .catch(error => {
            console.error('JSON 데이터를 가져오는 중 오류 발생:', error);
            reportContainer.innerHTML = '<p>데이터를 가져오는 데 실패했습니다.</p>';
        })
        .finally(() => {
            loadingElement.style.display = 'none';
        });

    function renderReports(data) {
        reportContainer.innerHTML = '';

        const isIsoFormat = Object.keys(data)[0].includes('T');
        const sortedData = Object.entries(data).sort(([dateA], [dateB]) => {
            const dateAParsed = isIsoFormat
                ? new Date(dateA)
                : new Date(dateA.slice(0, 4) + '-' + dateA.slice(4, 6) + '-' + dateA.slice(6, 8));
            const dateBParsed = isIsoFormat
                ? new Date(dateB)
                : new Date(dateB.slice(0, 4) + '-' + dateB.slice(4, 6) + '-' + dateB.slice(6, 8));
            return dateBParsed - dateAParsed;
        });

        sortedData.forEach(([date, firms]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateTitle = document.createElement('div');
            dateTitle.className = 'date-title';
            dateTitle.textContent = date;
            dateGroup.appendChild(dateTitle);

            Object.entries(firms).forEach(([firm, reports]) => {
                const companyGroup = document.createElement('div');
                companyGroup.className = 'company-group';

                const companyTitle = document.createElement('div');
                companyTitle.className = 'company-title';
                companyTitle.textContent = firm;
                companyGroup.appendChild(companyTitle);

                reports.forEach(report => {
                    const reportElement = document.createElement('div');
                    reportElement.className = 'report';

                    const reportLink = document.createElement('a');
                    reportLink.href = report.link;
                    reportLink.target = '_blank';
                    reportLink.textContent = report.title;

                    const reportWriter = document.createElement('p');
                    reportWriter.textContent = `작성자: ${report.writer}`;

                    reportElement.appendChild(reportLink);
                    reportElement.appendChild(reportWriter);
                    companyGroup.appendChild(reportElement);
                });

                dateGroup.appendChild(companyGroup);
            });

            reportContainer.appendChild(dateGroup);
        });
    }
});
