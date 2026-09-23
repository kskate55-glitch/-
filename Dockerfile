# 어느 호스팅에서도 같은 방식으로 뜨게 하는 컨테이너 정의 (63절).
# ⚠️ Render 전용 설정(render.yaml)만 있으면 다른 곳으로 옮길 때마다 빌드·실행
#    커맨드를 손으로 다시 맞춰야 하고, 그 과정에서 --timeout 120 같은 필수
#    옵션이 빠지면 조용히 500이 난다(22절). 컨테이너로 박아두면 그 위험이 없다.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# ⚠️ --timeout 120 이 꼭 필요하다 — 처음 조회하는 지역은 비교거래마다 좌표
#    변환을 호출해서 30초를 넘길 수 있는데, gunicorn 기본값(30초)이면 요청이
#    중간에 끊겨 500이 된다(22절에서 실제로 겪었다).
# ⚠️ 워커는 1개로 둔다 — 캐시를 프로세스 메모리에 들고 있어서(57절) 워커를
#    늘리면 각자 다른 캐시를 갖게 되고 적중률이 떨어진다. 늘리려면 62절
#    슈퍼베이스 같은 공용 저장소를 먼저 붙인다.
CMD exec gunicorn --chdir webapp --bind 0.0.0.0:$PORT --timeout 120 --workers 1 app:app
