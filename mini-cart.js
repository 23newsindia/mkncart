class MiniCartExtension {
    constructor() {
        this.initialized = false;
        this.activeNode = null;
        this.ajaxUrl = typeof window.wc_cart_fragments_params !== 'undefined' ? 
            window.wc_cart_fragments_params.wc_ajax_url : 
            (window._wpUtilSettings && window._wpUtilSettings.ajax ? window._wpUtilSettings.ajax.url : '/wp-admin/admin-ajax.php');
        
        this.init();
    }

    init() {
        if (this.initialized) return;
        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const miniCartBtn = e.target.closest('.ext-mini-cart');
            if (miniCartBtn) {
                e.preventDefault();
                this.handleMiniCartButtonClick(miniCartBtn);
            }

            const closeBtn = e.target.closest('.nasa-close-node, .close-nodes');
            if (closeBtn) {
                e.preventDefault();
                this.handleCloseButtonClick(closeBtn);
            }

            const applyBtn = e.target.closest('#mini-cart-apply_coupon');
            if (applyBtn) {
                e.preventDefault();
                this.handleApplyCoupon(applyBtn);
            }

            const publishedCoupon = e.target.closest('.publish-coupon:not(.nasa-actived)');
            if (publishedCoupon) {
                e.preventDefault();
                this.handlePublishedCouponClick(publishedCoupon);
            }

            const removeBtn = e.target.closest('.woocommerce-remove-coupon');
            if (removeBtn) {
                e.preventDefault();
                this.handleRemoveCoupon(removeBtn);
            }

            const saveNoteBtn = e.target.closest('#mini-cart-save_note');
            if (saveNoteBtn) {
                e.preventDefault();
                this.handleSaveNote(saveNoteBtn);
            }
        });

        document.body.addEventListener('nasa_opened_cart_sidebar', () => {
            this.loadNonces();
        });
    }

    async loadNonces() {
        try {
            const response = await fetch(this.getAjaxUrl('nasa_ext_cart_ajax_nonce'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = await response.json();
            
            if (data && data.fds) {
                const cartSidebar = document.getElementById('cart-sidebar');
                if (cartSidebar && !cartSidebar.querySelector('.mini-cart-ajax-nonce')) {
                    cartSidebar.insertAdjacentHTML('beforeend', data.fds);
                }
            }
        } catch (error) {
            console.error('Error loading nonces:', error);
        }
    }

    async refreshCartFragments() {
        try {
            const response = await fetch(this.getAjaxUrl('get_refreshed_fragments'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = await response.json();
            if (data && data.fragments) {
                await this.updateFragments(data.fragments);
                return data.fragments;
            }
        } catch (error) {
            console.error('Error refreshing cart fragments:', error);
        }
        return null;
    }

    handleMiniCartButtonClick(button) {
        const action = button.dataset.act;
        const cart = button.closest('.nasa-static-sidebar') || button.closest('.ns-cart-popup');
        
        if (!cart || !action) return;

        const miniCartWrap = cart.querySelector('.ext-mini-cart-wrap');
        if (!miniCartWrap || miniCartWrap.classList.contains('nasa-disable')) return;

        document.body.classList.add('canvas-on');
        cart.classList.add('ext-loading');

        if (!cart.querySelector('.close-nodes')) {
            cart.insertAdjacentHTML('beforeend', '<a href="javascript:void(0);" class="close-nodes"></a>');
        }

        cart.querySelectorAll('.ext-nodes-wrap .ext-node').forEach(node => {
            node.classList.remove('active');
        });

        const targetNode = cart.querySelector(`.ext-nodes-wrap .ext-node.mini-cart-${action}`);
        if (targetNode) {
            targetNode.classList.add('active');
            this.activeNode = targetNode;
        }

        if (!cart.querySelector('.mini-cart-ajax-nonce')) {
            this.loadNonces();
        }
    }

    handleCloseButtonClick(closeBtn) {
        const cart = closeBtn.closest('.nasa-static-sidebar') || closeBtn.closest('.ns-cart-popup');
        const node = closeBtn.closest('.ext-node');

        if (cart) {
            cart.classList.remove('ext-loading');
        }

        if (node) {
            node.classList.remove('active');
            this.activeNode = null;
        }

        const closeNodes = cart?.querySelector('.close-nodes');
        if (closeNodes) {
            closeNodes.remove();
        }
    }

    async handleApplyCoupon(button) {
        if (button.classList.contains('nasa-disable')) return;
        
        const couponInput = document.querySelector('#mini-cart-add-coupon_code');
        const couponCode = couponInput?.value?.trim();
        
        if (!couponCode) return;

        button.classList.add('nasa-disable');
        const cart = button.closest('.nasa-static-sidebar') || button.closest('.widget_shopping_cart_content');
        
        try {
            const nonce = document.querySelector('#apply_coupon_nonce')?.value;
            if (!nonce) {
                await this.loadNonces();
            }

            cart.classList.add('ext-loading');

            const response = await fetch(this.getAjaxUrl('apply_coupon'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    security: nonce || '',
                    coupon_code: couponCode
                })
            });

            const fragments = await this.refreshCartFragments();
            if (fragments) {
                this.showMessage('Coupon applied successfully');
                couponInput.value = '';

                const publishedCoupon = document.querySelector(`.publish-coupon[data-code="${couponCode}"]`);
                if (publishedCoupon) {
                    publishedCoupon.classList.add('nasa-actived');
                }

                const couponNode = button.closest('.ext-node');
                if (couponNode) {
                    couponNode.classList.remove('active');
                }
            } else {
                throw new Error('Failed to apply coupon');
            }

        } catch (error) {
            console.error('Error applying coupon:', error);
            this.showMessage(error.message || 'Error applying coupon', 'error');
        } finally {
            button.classList.remove('nasa-disable');
            cart.classList.remove('ext-loading');
        }
    }

    async handleRemoveCoupon(button) {
        if (button.classList.contains('nasa-disable')) return;
        
        const couponCode = button.dataset.coupon;
        if (!couponCode) return;

        button.classList.add('nasa-disable');
        const cart = button.closest('.nasa-static-sidebar') || button.closest('.widget_shopping_cart_content');
        
        try {
            const nonce = document.querySelector('#remove_coupon_nonce')?.value;
            if (!nonce) {
                await this.loadNonces();
            }

            cart.classList.add('ext-loading');

            const response = await fetch(this.getAjaxUrl('remove_coupon'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    security: nonce || '',
                    coupon: couponCode
                })
            });

            const fragments = await this.refreshCartFragments();
            if (fragments) {
                this.showMessage('Coupon removed successfully');

                const publishedCoupon = document.querySelector(`.publish-coupon[data-code="${couponCode}"]`);
                if (publishedCoupon) {
                    publishedCoupon.classList.remove('nasa-actived');
                }
            } else {
                throw new Error('Failed to remove coupon');
            }

        } catch (error) {
            console.error('Error removing coupon:', error);
            this.showMessage(error.message || 'Error removing coupon', 'error');
        } finally {
            button.classList.remove('nasa-disable');
            cart.classList.remove('ext-loading');
        }
    }

    async handleSaveNote(button) {
        if (button.classList.contains('nasa-disable')) return;
        
        const noteTextarea = document.querySelector('.mini-cart-note textarea[name="order_comments"]');
        const noteText = noteTextarea?.value?.trim() || '';
        
        button.classList.add('nasa-disable');
        const cart = button.closest('.nasa-static-sidebar') || button.closest('.widget_shopping_cart_content');
        const noteNode = button.closest('.ext-node');
        
        try {
            cart.classList.add('ext-loading');

            const response = await fetch(this.getAjaxUrl('nasa_mini_cart_note'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    order_comments: noteText
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.message || 'Failed to save note');
            }

            // Update fragments if provided
            if (data.fragments) {
                await this.updateFragments(data.fragments);
            }

            this.showMessage('Your order notes saved.');

            // Close note panel
            if (noteNode) {
                noteNode.classList.remove('active');
            }

        } catch (error) {
            console.error('Error saving note:', error);
            this.showMessage(error.message || 'Error saving note', 'error');
        } finally {
            button.classList.remove('nasa-disable');
            cart.classList.remove('ext-loading');
        }
    }

    handlePublishedCouponClick(coupon) {
        const code = coupon.dataset.code;
        if (!code) return;

        const input = document.querySelector('#mini-cart-add-coupon_code');
        if (input) {
            input.value = code;
            const applyButton = document.querySelector('#mini-cart-apply_coupon');
            if (applyButton) {
                applyButton.click();
            }
        }
    }

    async updateFragments(fragments) {
        if (!fragments) return;

        Object.entries(fragments).forEach(([selector, content]) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Create a temporary container
                const temp = document.createElement('div');
                temp.innerHTML = content;
                
                // Replace the old element with the new one
                if (element.parentNode) {
                    element.parentNode.replaceChild(temp.firstElementChild || temp.firstChild, element);
                }
            });
        });

        // Trigger events after updating fragments
        document.body.dispatchEvent(new Event('wc_fragments_refreshed'));
        document.body.dispatchEvent(new Event('updated_cart_totals'));
        document.body.dispatchEvent(new Event('nasa_init_shipping_free_notification'));
    }

    showMessage(message, type = 'success') {
        const wrap = document.querySelector('.ext-mini-cart-wrap');
        if (!wrap) return;

        wrap.querySelectorAll('.mess-wrap').forEach(mess => mess.remove());

        const messageWrap = document.createElement('div');
        messageWrap.className = 'mess-wrap';

        const messageContent = document.createElement('div');
        messageContent.className = type === 'success' ? 'woocommerce-message' : 'woocommerce-error';
        messageContent.setAttribute('role', 'alert');
        messageContent.textContent = message;

        messageWrap.appendChild(messageContent);
        wrap.appendChild(messageWrap);

        setTimeout(() => {
            messageWrap.remove();
        }, 5000);
    }

    getAjaxUrl(endpoint) {
        return this.ajaxUrl.toString().replace('%%endpoint%%', endpoint);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MiniCartExtension();
});
