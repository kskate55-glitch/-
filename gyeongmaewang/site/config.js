/* Supabase 연결 설정 — 비워 두면 회원 기능 없이 이 기기에만 저장된다.
   ⚠ anonKey 자리에는 anon(publishable) 키만. service_role / sb_secret_ 키는 절대 넣지 않는다(넣으면 자동으로 꺼진다). */
window.GMW_CLOUD = {
  url: "",        // 예: https://abcdxyz.supabase.co
  anonKey: "",    // Project Settings → API → anon public (또는 sb_publishable_...)
  emailDomain: "users.kyungmaewang.local"   // 아이디를 가짜 이메일로 바꿀 때 쓰는 도메인(사용자에게 안 보인다)
};
