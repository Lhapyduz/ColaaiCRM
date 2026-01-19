'use client';

import React from 'react';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

export default function TermosPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-[800px] mx-auto px-6 py-12">
                <div className="mb-8">
                    <Link href="/vendas" className="inline-flex items-center gap-2 text-primary hover:underline mb-4"><FiArrowLeft /> Voltar</Link>
                    <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
                    <p className="text-text-muted">Última atualização: 06 de Janeiro de 2026</p>
                </div>

                <div className="prose prose-invert max-w-none">
                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">1. Aceitação dos Termos</h2><p className="text-text-secondary leading-relaxed">Ao acessar e utilizar a plataforma Cola Aí ("Plataforma"), você declara ter lido, compreendido e concordado com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">2. Descrição do Serviço</h2><p className="text-text-secondary leading-relaxed mb-3">O Cola Aí é uma plataforma de gestão para estabelecimentos do ramo alimentício, oferecendo funcionalidades como:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Gestão de pedidos e vendas</li><li>Controle de produtos e estoque</li><li>Relatórios e análises</li><li>Programas de fidelidade</li><li>Cardápio digital online</li><li>Gestão de entregas</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">3. Cadastro e Conta do Usuário</h2><p className="text-text-secondary leading-relaxed mb-3">Para utilizar a Plataforma, você deve criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Manter a confidencialidade de sua senha</li><li>Todas as atividades realizadas em sua conta</li><li>Notificar imediatamente sobre qualquer uso não autorizado</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">4. Planos e Pagamentos</h2><p className="text-text-secondary leading-relaxed mb-3">A Plataforma oferece diferentes planos de assinatura (Básico, Avançado e Profissional) com funcionalidades e limites específicos. Os pagamentos são processados de forma segura através do Stripe.</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>As cobranças são recorrentes conforme o período escolhido (mensal ou anual)</li><li>Você pode cancelar sua assinatura a qualquer momento</li><li>Não há reembolso proporcional para cancelamentos antes do fim do período</li><li>Os preços podem ser alterados com aviso prévio de 30 dias</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">5. Período de Teste Gratuito</h2><p className="text-text-secondary leading-relaxed">Oferecemos 3 dias de teste gratuito para novos usuários. Durante este período, você terá acesso às funcionalidades do plano Avançado. Não é necessário informar dados de pagamento para iniciar o período de teste.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">6. Uso Aceitável</h2><p className="text-text-secondary leading-relaxed mb-3">Ao utilizar a Plataforma, você concorda em NÃO:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Violar leis ou regulamentos aplicáveis</li><li>Infringir direitos de propriedade intelectual</li><li>Transmitir vírus ou códigos maliciosos</li><li>Tentar acessar sistemas ou dados não autorizados</li><li>Utilizar a plataforma para fins ilegais ou fraudulentos</li><li>Revender ou sublicenciar o acesso à plataforma</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">7. Propriedade Intelectual</h2><p className="text-text-secondary leading-relaxed">Todo o conteúdo da Plataforma, incluindo textos, gráficos, logotipos, ícones, imagens e software, é de propriedade exclusiva do Cola Aí ou de seus licenciadores, protegido por leis de direitos autorais e propriedade intelectual.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">8. Dados do Usuário</h2><p className="text-text-secondary leading-relaxed">Você mantém a propriedade de todos os dados que inserir na Plataforma. Concedemos a você o direito de exportar seus dados a qualquer momento. Para mais informações sobre como tratamos seus dados, consulte nossa <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">9. Disponibilidade do Serviço</h2><p className="text-text-secondary leading-relaxed">Nos esforçamos para manter a Plataforma disponível 24 horas por dia, 7 dias por semana. No entanto, podem ocorrer interrupções para manutenção ou por fatores fora do nosso controle. Não garantimos disponibilidade ininterrupta.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">10. Limitação de Responsabilidade</h2><p className="text-text-secondary leading-relaxed mb-3">Na extensão máxima permitida por lei, o Cola Aí não será responsável por:</p><ul className="list-disc pl-6 text-text-secondary space-y-1"><li>Danos indiretos, incidentais ou consequenciais</li><li>Perda de dados, lucros ou receitas</li><li>Interrupções de serviço ou falhas técnicas</li><li>Decisões tomadas com base em informações da plataforma</li></ul></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">11. Modificações dos Termos</h2><p className="text-text-secondary leading-relaxed">Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos sobre alterações significativas por email ou através da Plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">12. Rescisão</h2><p className="text-text-secondary leading-relaxed">Podemos suspender ou encerrar seu acesso à Plataforma por violação destes Termos ou por qualquer outro motivo, a nosso critério. Você pode encerrar sua conta a qualquer momento através das configurações.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">13. Lei Aplicável e Foro</h2><p className="text-text-secondary leading-relaxed">Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de Guaratuba, PR, com exclusão de qualquer outro.</p></section>

                    <section className="mb-8"><h2 className="text-xl font-semibold mb-3 text-primary">14. Contato</h2><p className="text-text-secondary leading-relaxed mb-3">Para dúvidas sobre estes Termos de Uso, entre em contato conosco:</p><ul className="list-disc pl-6 text-text-secondary"><li>Email: contato@colaai.com.br</li></ul></section>
                </div>

                <div className="flex items-center justify-center gap-4 pt-8 border-t border-border mt-8">
                    <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>
                    <span className="text-text-muted">|</span>
                    <Link href="/vendas" className="text-primary hover:underline">Voltar ao Início</Link>
                </div>
            </div>
        </div>
    );
}
