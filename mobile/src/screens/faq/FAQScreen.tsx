import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQScreen: React.FC = () => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'Jak si mohu zapůjčit přívěs?',
      answer: 'Přívěs si můžete zapůjčit jednoduše přes naší mobilní aplikaci. Vyberte si přívěs na mapě, zvolte datum, proveďte rezervaci a platbu, a obdržíte PIN kód pro odemčení přívěsu.',
      category: 'rezervace',
    },
    {
      id: '2',
      question: 'Jaké doklady potřebuji k zapůjčení?',
      answer: 'K zapůjčení potřebujete platný občanský průkaz. Pokud jste firma, je potřeba také IČO. Vše probíhá online přes aplikaci, žádné papírování není nutné.',
      category: 'rezervace',
    },
    {
      id: '3',
      question: 'Jak funguje přístup k přívěsu?',
      answer: 'Po úspěšné rezervaci a platbě obdržíte jedinečný PIN kód, který slouží k odemčení chytrého zámku Igloohome na přívěsu. PIN je platný po dobu vašeho pronájmu.',
      category: 'přístup',
    },
    {
      id: '4',
      question: 'Co když si nejsem jistý, jak přívěs zapojit?',
      answer: 'Každý přívěs má přiložený návod k obsluze a propojení. Pokud byste si nebyli jisti, kontaktujte naši podporu na telefonním čísle uvedeném v aplikaci.',
      category: 'používání',
    },
    {
      id: '5',
      question: 'Jaké jsou platební podmínky?',
      answer: 'Při rezervaci je blokována částka 0 Kč pro ověření platby. Skutečná platba je stržena až po ukončení pronájmu podle skutečné délky používání.',
      category: 'platba',
    },
    {
      id: '6',
      question: 'Jaké metody platby přijímáte?',
      answer: 'Přijímáme platební karty, Apple Pay, Google Pay a další 3D Secure metody. Všechny transakce jsou zabezpečeny přes Stripe.',
      category: 'platba',
    },
    {
      id: '7',
      question: 'Co když potřebuji prodloužit pronájem?',
      answer: 'Pronájem se automaticky prodlouží o další den, pokud přívěs nevrátíte v den ukončení rezervace. V aplikaci uvidíte aktuální stav a cenu prodloužení.',
      category: 'pronájem',
    },
    {
      id: '8',
      question: 'Jaké jsou poplatky za pozdní vrácení?',
      answer: 'Pozdní vrácení je zpoplatněno podle ceníku. Při automatickém prodloužení je účtována denní sazba za další den pronájmu.',
      category: 'pronájem',
    },
    {
      id: '9',
      question: 'Jaké je pojištění?',
      answer: 'Každý pronájem obsahuje základní pojištění. Doporučujeme přikoupit rozšířené pojištění pro krytí všech případných škod. Podrobnosti najdete v smluvních podmínkách.',
      category: 'pojištění',
    },
    {
      id: '10',
      question: 'Co při nehodě nebo poruše?',
      answer: 'V případě nehody okamžitě kontaktujte naši podporu a policii. Vše postupujte podle pokynů v aplikaci. Neprovádějte vlastní opravy.',
      category: 'pojištění',
    },
    {
      id: '11',
      question: 'Jaké jsou technické parametry přívěsů?',
      answer: 'Každý přívěs má uvedené technické parametry v detailu - nosnost, rozměry, hmotnost atd. Ujistěte se, že váš vozidlo splňuje požadavky pro tažení.',
      category: 'technické',
    },
    {
      id: '12',
      question: 'Musím mít řidičský průkaz na tažení?',
      answer: 'Ano, pro tažení přívěsů nad 750 kg je potřeba řidičský průkaz skupiny B96 nebo B+E. Zkontrolujte si požadavky pro konkrétní přívěs.',
      category: 'technické',
    },
  ];

  const categories = [
    { id: 'all', label: 'Vše', icon: 'apps' },
    { id: 'rezervace', label: 'Rezervace', icon: 'event' },
    { id: 'přístup', label: 'Přístup', icon: 'lock' },
    { id: 'používání', label: 'Používání', icon: 'build' },
    { id: 'platba', label: 'Platba', icon: 'payment' },
    { id: 'pronájem', label: 'Pronájem', icon: 'schedule' },
    { id: 'pojištění', label: 'Pojištění', icon: 'security' },
    { id: 'technické', label: 'Technické', icon: 'settings' },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const filteredFAQs = selectedCategory === 'all'
    ? faqData
    : faqData.filter(item => item.category === selectedCategory);

  const handleContactSupport = () => {
    Alert.alert(
      'Kontakt na podporu',
      'Tel: +420 123 456 789\nEmail: podpora@pripoj.to\n\nJsme k dispozici denně 8:00-20:00',
      [
        { text: 'Zavřít', style: 'cancel' },
        { text: 'Volat', onPress: () => Linking.openURL('tel:+420123456789') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Často kladené otázky</Text>
        <Text style={styles.subtitle}>
          Najděte odpovědi na vaše dotazy
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Icon
              name={category.icon}
              size={16}
              color={selectedCategory === category.id ? '#3b82f6' : '#6b7280'}
              style={styles.categoryIcon}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAQ Items */}
      <ScrollView
        style={styles.faqContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.faqContent}
      >
        {filteredFAQs.map((item) => (
          <View key={item.id} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.questionContainer}
              onPress={() => toggleExpanded(item.id)}
            >
              <Text style={styles.question}>{item.question}</Text>
              <Icon
                name={expandedItems.has(item.id) ? 'expand-less' : 'expand-more'}
                size={24}
                color="#6b7280"
              />
            </TouchableOpacity>

            {expandedItems.has(item.id) && (
              <View style={styles.answerContainer}>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Contact Support */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <Icon name="support-agent" size={20} color="#3b82f6" />
          <Text style={styles.contactText}>Kontaktovat podporu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  categoriesContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCategory: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  faqContainer: {
    flex: 1,
  },
  faqContent: {
    padding: 20,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  answer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 8,
  },
});

export default FAQScreen;