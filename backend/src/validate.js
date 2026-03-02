export function parseRequestBody(body) {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid payload: expected object');
    }
    const payload = body;
    const userProfile = payload.userProfile;
    const product = payload.product;
    if (!userProfile || typeof userProfile !== 'object') {
        throw new Error('Invalid payload: userProfile is required');
    }
    if (!product || typeof product !== 'object') {
        throw new Error('Invalid payload: product is required');
    }
    if (!product.productId || !product.name || !product.category || !Array.isArray(product.ingredients)) {
        throw new Error('Invalid product: productId, name, category, ingredients[] are required');
    }
    const skinType = userProfile.skinType;
    const validSkin = ['oily', 'dry', 'combination', 'sensitive', 'normal'];
    if (!validSkin.includes(String(skinType))) {
        throw new Error('Invalid userProfile.skinType');
    }
    return { userProfile, product };
}
