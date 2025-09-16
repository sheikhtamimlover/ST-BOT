
module.exports = function(config) {
    return function passwordAuth(req, res, next) {
        // Check if password protection is enabled
        if (!config.dashBoard.passwordProtection.enable) {
            return next();
        }

        // Login and logout routes
        if (req.path === '/login') {
            if (req.method === 'GET') {
                return res.render('login', { config });
            } else if (req.method === 'POST') {
                const { password } = req.body;
                const correctPassword = config.dashBoard.passwordProtection.password;
                
                if (password === correctPassword) {
                    req.session.authenticated = true;
                    return res.json({ success: true });
                } else {
                    return res.json({ success: false, message: 'Invalid password' });
                }
            }
        }

        if (req.path === '/logout' && req.method === 'POST') {
            req.session.destroy();
            return res.json({ success: true });
        }

        // Check if user is authenticated
        if (!req.session.authenticated) {
            return res.redirect('/login');
        }

        next();
    };
};
