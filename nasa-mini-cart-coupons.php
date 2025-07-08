Save
nasa-mini-cart-coupons.php

1
<?php
2
defined('ABSPATH') || exit;
3
​
4
$coupons = WC()->cart->get_coupons();
5
​
6
if ($coupons) :
7
    foreach ($coupons as $code => $coupon) : ?>
8
        <div class="coupon-wrap ext-item-wrap nasa-flex jbw" data-code="<?php echo esc_attr($coupon->get_code()); ?>">
9
            <span class="coupon-label ext-item-label">
10
                <?php wc_cart_totals_coupon_label($coupon); ?>
11
            </span>
12
​
13
            <span class="coupon-content ext-item-content">
14
                <?php wc_cart_totals_coupon_html($coupon); ?>
15
            </span>
16
        </div>
17
    <?php
18
    endforeach;
19
endif;
20
​
