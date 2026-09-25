# 경매왕 자산 목록 (자동 생성)

게임 코드가 참조하는 그림 **332곳 · 서로 다른 파일 266장** · `site/assets/` 파일 268장 · 전체 35.6MB.

- 깨진 경로(코드가 부르는데 파일 없음): **0**
- 미사용 파일(파일은 있는데 코드가 안 부름): **0**
- 같은 그림을 여러 자리에 재사용: 66장 (예: 표정 기본값을 다른 슬롯이 공유)

⚠ README의 '95장'은 옛 숫자다 — 지금은 266장이다.

## 엔딩 일러스트 24종 — 4단계 상태

| 캐릭터 | NORMAL | GOOD | BAD | SPECIAL |
|---|---|---|---|---|
| 한서윤 | ✅ 반영 완료 | ✅ 반영 완료 | ✅ 반영 완료 | ✅ 반영 완료 |
| 이도현 | ✅ 반영 완료 | ✅ 반영 완료 | ✅ 반영 완료 | 📥 그림 있음·파일 재전송 필요 |
| 윤미정 | 📥 그림 있음·파일 재전송 필요 | ✅ 반영 완료 | 📥 그림 있음·파일 재전송 필요 | 📥 그림 있음·파일 재전송 필요 |
| 박재훈 | 📥 그림 있음·파일 재전송 필요 | ✅ 반영 완료 | ✅ 반영 완료 | ✅ 반영 완료 |
| 최은경 | ✅ 반영 완료 | ✅ 반영 완료 | ✅ 반영 완료 | ✅ 반영 완료 |
| 김태식 | ✅ 반영 완료 | ✅ 반영 완료 | 🎨 미제작 | 🎨 미제작 |

✅ = 파일이 `site/assets/`에 있고 `CP_END_ART`에 연결됨(서윤·도현 5장과 재훈 GOOD은 테스트 t72로 엔딩 화면 표시까지 확인). 📥 = 대화 중 이미지로는 받았지만 파일로 저장되지 않아 다시 받아야 함. 🎨 = 아직 그림 없음(글만 나옴).

## 그룹별 목록

### ART_DEFAULT (190)
`npc_oldman_neutral`, `npc_ajumma_neutral`, `npc_youngman_neutral`, `npc_broker_neutral`, `npc_mover_neutral`, `npc_player_neutral`, `bg_room_clean`, `npc_youngman_troubled`, `npc_youngman_angry`, `npc_roughman_neutral`, `npc_roughman_angry`, `npc_ajumma_troubled`, `npc_youngwoman_neutral`, `cut_moving`, `bg_court`, `bg_stairs`, `bg_villa_night`, `npc_husband_neutral`, `npc_husband_angry`, `npc_husband_troubled`, `bg_alley`, `bg_villa_day`, `npc_bailiff_neutral`, `npc_couple_hw_angry`, `npc_couple_hw_neutral`, `npc_couple_hw_troubled`, `npc_foreman_angry`, `npc_foreman_neutral`, `npc_foreman_troubled`, `npc_grandma_neutral`, `npc_greedy_angry`, `npc_greedy_neutral`, `npc_greedy_troubled`, `npc_kid_neutral`, `npc_locksmith_neutral`, `npc_manager_neutral`, `npc_mind_angry`, `npc_mind_neutral`, `npc_mind_troubled`, `npc_owner_angry`, `npc_owner_neutral`, `npc_owner_troubled`, `npc_student_cn_angry`, `npc_student_cn_neutral`, `npc_student_cn_troubled`, `npc_worker_angry`, `npc_worker_mn_angry`, `npc_worker_mn_neutral`, `npc_worker_mn_troubled`, `npc_worker_neutral`, `npc_worker_troubled`, `npc_workers_pk_angry`, `npc_workers_pk_neutral`, `npc_workers_pk_troubled`, `prop_cat`, `prop_dog`, `bg_banjiha`, `bg_factory_dorm`, `bg_oneroom`, `bg_realtor`, `bg_rooftop`, `bg_room_messy`, `bg_shop_closed`, `bg_warehouse`, `cut_aftermath`, `cut_court_order`, `cut_keys`, `cut_notice`, `cut_signing`, `bg_front_door`, `npc_sister_troubled`, `npc_sister_neutral`, `npc_sister_angry`, `npc_p_coop_worried`, `npc_p_coop_normal`, `npc_p_coop_angry`, `npc_p_grandpa_worried`, `npc_p_grandpa_normal`, `npc_p_grandpa_angry`, `npc_p_grandpa_furious`, `prop_envelope`, `bg_office_2`, `bg_office_3`, `npc_playerf_normal`, `npc_playerf_happy`, `npc_playerf_angry`, `npc_playerf_worried`, `npc_playerf_shocked`, `npc_playerf_soft`, `cut_bid_open`, `bg_bid_room`, `bg_room_after`, `bg_office_1`, `bg_base_sillim`, `cut_seoyun_found`, `bg_base_hwagok`, `cut_dohyun_commute`, `bg_base_yeongdeungpo`, `cut_mijeong_shop`, `bg_base_bulgwang`, `cut_jaehoon_site`, `bg_base_mapo`, `cut_eunkyung_morning`, `bg_base_mokdong`, `cut_taesik_morning`, `npc_oldman_angry`, `npc_oldman_troubled`, `npc_ajumma_angry`, `npc_roughman_troubled`, `npc_youngwoman_angry`, `npc_youngwoman_troubled`, `npc_broker_angry`, `npc_broker_troubled`, `npc_mover_angry`, `npc_mover_troubled`, `npc_bailiff_normal`, `prop_keys`, `prop_doorlock`, `prop_letter`, `prop_order`, `prop_confirm`, `prop_boxes`, `prop_cash`, `prop_notice`, `prop_truck`, `prop_phone`, `prop_calendar`, `prop_bill`, `prop_drink`, `prop_toolbox`, `prop_delivery_boxes`, `prop_trash_bags`, `prop_mail_bundle`, `prop_shoes_slippers`, `prop_safe_box`, `cut_empty_after`, `ext_k1`, `ext_k2`, `ext_tenant`, `ext_share`, `ext_lien`, `ext_land`, `ext_shop`, `ext_officetel`, `ext_factory`, `ext_shopbldg`, `wx_clear`, `wx_cloud`, `wx_rain`, `wx_snow`, `wx_dusk`, `ev_docs`, `ev_lease`, `ev_resid`, `ev_photos`, `ev_fee`, `ev_chat`, `ev_bank`, `ev_keys`, `ev_bill`, `ev_contract`, `ev_doorlock`, `ev_chat2`, `ev_trash`, `ev_meter`, `ev_cctv`, `ev_note`, `ev_housekey`, `ev_bath`, `bg_int_hall`, `bg_int_goshi`, `bg_int_shop`, `bg_int_factory`, `npc_type_debtor`, `npc_type_family`, `npc_type_lien`, `npc_type_haggler`, `npc_type_absent`, `npc_granny_normal`, `npc_granny_angry`, `npc_granny_worried`, `npc_granny_happy`, `npc_granny_shocked`, `npc_granny_soft`, `npc_hoodie_normal`, `npc_hoodie_happy`, `npc_hoodie_angry`, `npc_hoodie_worried`, `npc_hoodie_shocked`, `npc_hoodie_soft`

### LF_CHAR_ART.seoyun (11)
`face.normal`, `face.happy`, `face.shocked`, `face.worried`, `face.angry`, `face.tired`, `front`, `back`, `select`, `found`, `room`

### LF_CHAR_ART.dohyun (11)
`face.normal`, `face.happy`, `face.shocked`, `face.worried`, `face.angry`, `face.tired`, `front`, `back`, `select`, `commute`, `room`

### LF_CHAR_ART.mijeong (11)
`face.normal`, `face.happy`, `face.shocked`, `face.worried`, `face.angry`, `face.tired`, `front`, `back`, `select`, `shop`, `room`

### LF_CHAR_ART.jaehoon (11)
`face.normal`, `face.happy`, `face.shocked`, `face.worried`, `face.angry`, `face.tired`, `front`, `back`, `select`, `site`, `room`

### LF_CHAR_ART.eunkyung (11)
`face.normal`, `face.happy`, `face.shocked`, `face.worried`, `face.angry`, `face.tired`, `front`, `back`, `select`, `morning`, `room`

### LF_CHAR_ART.taesik (11)
`face.normal`, `face.happy`, `face.shocked`, `face.worried`, `face.angry`, `face.tired`, `front`, `back`, `select`, `morning`, `room`

### CP_END_ART.seoyun (4)
`good`, `normal`, `bad`, `special`

### CP_END_ART.dohyun (3)
`good`, `normal`, `bad`

### CP_END_ART.mijeong (1)
`good`

### CP_END_ART.jaehoon (1)
`good`

### CP_END_ART.eunkyung (1)
`good`

### SH_ART (54)
`ext_k1`, `ext_k2`, `ext_tenant`, `ext_share`, `ext_lien`, `ext_land`, `ext_shop`, `ext_officetel`, `ext_factory`, `ext_shopbldg`, `wx_clear`, `wx_cloud`, `wx_rain`, `wx_snow`, `wx_dusk`, `ev_docs`, `ev_lease`, `ev_resid`, `ev_photos`, `ev_fee`, `ev_chat`, `ev_bank`, `ev_keys`, `ev_bill`, `ev_contract`, `ev_doorlock`, `ev_chat2`, `ev_trash`, `ev_meter`, `ev_cctv`, `ev_note`, `ev_housekey`, `ev_bath`, `bg_int_hall`, `bg_int_goshi`, `bg_int_shop`, `bg_int_factory`, `npc_type_debtor`, `npc_type_family`, `npc_type_lien`, `npc_type_haggler`, `npc_type_absent`, `npc_granny_normal`, `npc_granny_angry`, `npc_granny_worried`, `npc_granny_happy`, `npc_granny_shocked`, `npc_granny_soft`, `npc_hoodie_normal`, `npc_hoodie_happy`, `npc_hoodie_angry`, `npc_hoodie_worried`, `npc_hoodie_shocked`, `npc_hoodie_soft`

### DP_PROP_ART (12)
`umb_wet`, `umb`, `frame`, `memo`, `papers`, `ramen`, `coffee`, `tie`, `ledger`, `tape`, `calc`, `notebook`

